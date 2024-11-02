package payment

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"net/http"
	"strings"

	"github.com/isucon/isucon14/bench/internal/concurrent"
)

type PostPaymentRequest struct {
	Amount int `json:"amount"`
}

func (r *PostPaymentRequest) IsSamePayload(token string, p *Payment) bool {
	return token == p.Token && r.Amount == p.Amount
}

func getTokenFromAuthorizationHeader(r *http.Request) (string, error) {
	auth := r.Header.Get(AuthorizationHeader)
	prefix := AuthorizationHeaderPrefix
	if !strings.HasPrefix(auth, prefix) {
		return "", fmt.Errorf("不正な値がAuthorization headerにセットされています。expected: Bearer ${token}. got: %s", auth)
	}
	return auth[len(prefix):], nil
}

func (s *Server) PostPaymentsHandler(w http.ResponseWriter, r *http.Request) {
	var (
		p          *Payment
		newPayment bool
	)

	idk := r.Header.Get(IdempotencyKeyHeader)
	if len(idk) > 0 {
		p, newPayment = s.knownKeys.GetOrSetDefault(idk, func() *Payment { return NewPayment(idk) })
		if !newPayment && p.locked.Load() {
			writeJSON(w, http.StatusConflict, map[string]string{"message": "既に処理中です"})
			return
		}
	} else {
		p = NewPayment("")
		newPayment = true
	}

	token, err := getTokenFromAuthorizationHeader(r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": err.Error()})
		return
	}

	var req PostPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "不正なリクエスト形式です"})
		return
	}
	if !newPayment {
		if !req.IsSamePayload(token, p) {
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"message": "リクエストペイロードがサーバーに記録されているものと異なります"})
			return
		}
		writeResponse(w, p.Status)
		return
	} else {
		p.Token = token
		p.Amount = req.Amount
	}

	// 決済処理
	// キューに入れて完了を待つ(ブロッキング)
	if concurrent.TrySend(s.queue, p) {
		<-p.processChan
		p.locked.Store(false)

		select {
		case <-r.Context().Done():
			// クライアントが既に切断している
			return
		default:
			writeResponse(w, p.Status)
		}
		return
	}

	// キューが詰まっていても確率で成功させる
	if rand.IntN(5) == 0 {
		s.queue <- p
		<-p.processChan
		p.locked.Store(false)

		select {
		case <-r.Context().Done():
			// クライアントが既に切断している
			return
		default:
			writeResponse(w, p.Status)
		}
		return
	}

	// エラーを返した場合でもキューに入る場合がある
	if rand.IntN(5) == 0 {
		go func() {
			s.queue <- p
			<-p.processChan
			p.locked.Store(false)
		}()
	}

	// 不安定なエラーを再現
	switch rand.IntN(3) {
	case 0:
		w.WriteHeader(http.StatusInternalServerError)
	case 1:
		w.WriteHeader(http.StatusBadGateway)
	case 2:
		w.WriteHeader(http.StatusGatewayTimeout)
	}
}

type ResponsePayment struct {
	Amount int    `json:"amount"`
	Status string `json:"status"`
}

func NewResponsePayment(p *Payment) ResponsePayment {
	return ResponsePayment{
		Amount: p.Amount,
		Status: p.Status.String(),
	}
}

func (s *Server) GetPaymentsHandler(w http.ResponseWriter, r *http.Request) {
	token, err := getTokenFromAuthorizationHeader(r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": err.Error()})
		return
	}

	payments, ok := s.acceptedPayments.Get(token)
	if !ok {
		writeJSON(w, http.StatusOK, []ResponsePayment{})
		return
	}

	res := []ResponsePayment{}
	for _, p := range payments.ToSlice() {
		res = append(res, NewResponsePayment(p))
	}
	writeJSON(w, http.StatusOK, res)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error(err.Error())
	}
}

func writeResponse(w http.ResponseWriter, paymentStatus Status) {
	switch paymentStatus {
	case StatusSuccess:
		w.WriteHeader(http.StatusNoContent)
	case StatusInvalidAmount:
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "決済額が不正です"})
	case StatusInvalidToken:
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "決済トークンが無効です"})
	}
}
