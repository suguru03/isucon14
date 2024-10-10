package payment

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gavv/httpexpect/v2"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestPostPaymentRequest_IsSamePayload(t *testing.T) {
	tests := []struct {
		req    PostPaymentRequest
		p      *Payment
		expect bool
	}{
		{
			req:    PostPaymentRequest{Token: "t1", Amount: 1000},
			p:      &Payment{Token: "t1", Amount: 1000},
			expect: true,
		},
		{
			req:    PostPaymentRequest{Token: "t2", Amount: 1000},
			p:      &Payment{Token: "t1", Amount: 1000},
			expect: false,
		},
		{
			req:    PostPaymentRequest{Token: "t1", Amount: 10000},
			p:      &Payment{Token: "t1", Amount: 1000},
			expect: false,
		},
	}
	for i, tt := range tests {
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			assert.Equal(t, tt.expect, tt.req.IsSamePayload(tt.p))
		})
	}
}

func TestServer_PaymentHandler(t *testing.T) {
	prepare := func(t *testing.T) (*Server, *MockVerifier, *httpexpect.Expect) {
		mockCtrl := gomock.NewController(t)
		verifier := NewMockVerifier(mockCtrl)
		server := NewServer(verifier, 1*time.Millisecond)
		httpServer := httptest.NewServer(server)
		t.Cleanup(httpServer.Close)
		e := httpexpect.Default(t, httpServer.URL)

		return server, verifier, e
	}

	t.Run("冪等性ヘッダーあり", func(t *testing.T) {
		t.Run("キーがサーバーにない", func(t *testing.T) {
			t.Run("Status = StatusSuccess", func(t *testing.T) {
				_, verifier, e := prepare(t)

				token := "token1"
				amount := 1000

				verifier.EXPECT().
					Verify(gomock.Cond(func(x *Payment) bool {
						return x.Token == token && x.Amount == amount
					})).
					Return(StatusSuccess)

				e.POST("/payment").
					WithHeader(IdempotencyKeyHeader, "idk1").
					WithJSON(map[string]any{
						"token":  token,
						"amount": amount,
					}).
					Expect().
					Status(http.StatusNoContent)
			})
			t.Run("Status = StatusInvalidAmount", func(t *testing.T) {
				_, verifier, e := prepare(t)

				token := "token1"
				amount := 0

				verifier.EXPECT().
					Verify(gomock.Cond(func(x *Payment) bool {
						return x.Token == token && x.Amount == amount
					})).
					Return(StatusInvalidAmount)

				e.POST("/payment").
					WithHeader(IdempotencyKeyHeader, "idk1").
					WithJSON(map[string]any{
						"token":  token,
						"amount": amount,
					}).
					Expect().
					Status(http.StatusBadRequest).
					JSON().Object().IsEqual(map[string]string{"message": "決済額が不正です"})
			})
			t.Run("Status = StatusInvalidToken", func(t *testing.T) {
				_, verifier, e := prepare(t)

				token := "token1"
				amount := 1000

				verifier.EXPECT().
					Verify(gomock.Cond(func(x *Payment) bool {
						return x.Token == token && x.Amount == amount
					})).
					Return(StatusInvalidToken)

				e.POST("/payment").
					WithHeader(IdempotencyKeyHeader, "idk1").
					WithJSON(map[string]any{
						"token":  token,
						"amount": amount,
					}).
					Expect().
					Status(http.StatusBadRequest).
					JSON().Object().IsEqual(map[string]string{"message": "決済トークンが無効です"})
			})
		})
		t.Run("キーがサーバーにあって、処理済み", func(t *testing.T) {
			t.Run("Status = StatusSuccess", func(t *testing.T) {
				server, _, e := prepare(t)

				idk := "idk1"
				token := "token1"
				amount := 1000

				server.knownKeys.Set(idk, &Payment{
					IdempotencyKey: idk,
					Token:          token,
					Amount:         amount,
					Status:         StatusSuccess,
				})

				e.POST("/payment").
					WithHeader(IdempotencyKeyHeader, idk).
					WithJSON(map[string]any{
						"token":  token,
						"amount": amount,
					}).
					Expect().
					Status(http.StatusNoContent)
			})
			t.Run("Status = StatusInvalidAmount", func(t *testing.T) {
				server, _, e := prepare(t)

				idk := "idk1"
				token := "token1"
				amount := 0

				server.knownKeys.Set(idk, &Payment{
					IdempotencyKey: idk,
					Token:          token,
					Amount:         amount,
					Status:         StatusInvalidAmount,
				})

				e.POST("/payment").
					WithHeader(IdempotencyKeyHeader, idk).
					WithJSON(map[string]any{
						"token":  token,
						"amount": amount,
					}).
					Expect().
					Status(http.StatusBadRequest).
					JSON().Object().IsEqual(map[string]string{"message": "決済額が不正です"})
			})
			t.Run("Status = StatusInvalidToken", func(t *testing.T) {
				server, _, e := prepare(t)

				idk := "idk1"
				token := "token1"
				amount := 1000

				server.knownKeys.Set(idk, &Payment{
					IdempotencyKey: idk,
					Token:          token,
					Amount:         amount,
					Status:         StatusInvalidToken,
				})
				e.POST("/payment").
					WithHeader(IdempotencyKeyHeader, idk).
					WithJSON(map[string]any{
						"token":  token,
						"amount": amount,
					}).
					Expect().
					Status(http.StatusBadRequest).
					JSON().Object().IsEqual(map[string]string{"message": "決済トークンが無効です"})
			})
			t.Run("ペイロード不一致", func(t *testing.T) {
				server, _, e := prepare(t)

				idk := "idk1"
				token := "token1"
				amount := 1000

				server.knownKeys.Set(idk, &Payment{
					IdempotencyKey: idk,
					Token:          token,
					Amount:         10001,
					Status:         StatusSuccess,
				})
				e.POST("/payment").
					WithHeader(IdempotencyKeyHeader, idk).
					WithJSON(map[string]any{
						"token":  token,
						"amount": amount,
					}).
					Expect().
					Status(http.StatusUnprocessableEntity).
					JSON().Object().IsEqual(map[string]string{"message": "リクエストペイロードがサーバーに記録されているものと異なります"})
			})
		})
		t.Run("キーがサーバーにあって、処理中", func(t *testing.T) {
			server, _, e := prepare(t)

			idk := "idk1"
			token := "token1"
			amount := 1000

			p := &Payment{
				IdempotencyKey: idk,
				Token:          token,
				Amount:         1000,
				Status:         StatusInitial,
			}
			p.Locked.Store(true)

			server.knownKeys.Set(idk, p)
			e.POST("/payment").
				WithHeader(IdempotencyKeyHeader, idk).
				WithJSON(map[string]any{
					"token":  token,
					"amount": amount,
				}).
				Expect().
				Status(http.StatusConflict).
				JSON().Object().IsEqual(map[string]string{"message": "既に処理中です"})
		})
	})
	t.Run("冪等性ヘッダーなし", func(t *testing.T) {
		t.Run("Status = StatusSuccess", func(t *testing.T) {
			_, verifier, e := prepare(t)

			token := "token1"
			amount := 1000

			verifier.EXPECT().
				Verify(gomock.Cond(func(x *Payment) bool {
					return x.Token == token && x.Amount == amount
				})).
				Return(StatusSuccess)

			e.POST("/payment").
				WithJSON(map[string]any{
					"token":  token,
					"amount": amount,
				}).
				Expect().
				Status(http.StatusNoContent)
		})
		t.Run("Status = StatusInvalidAmount", func(t *testing.T) {
			_, verifier, e := prepare(t)

			token := "token1"
			amount := 0

			verifier.EXPECT().
				Verify(gomock.Cond(func(x *Payment) bool {
					return x.Token == token && x.Amount == amount
				})).
				Return(StatusInvalidAmount)

			e.POST("/payment").
				WithJSON(map[string]any{
					"token":  token,
					"amount": amount,
				}).
				Expect().
				Status(http.StatusBadRequest).
				JSON().Object().IsEqual(map[string]string{"message": "決済額が不正です"})
		})
		t.Run("Status = StatusInvalidToken", func(t *testing.T) {
			_, verifier, e := prepare(t)

			token := "token1"
			amount := 1000

			verifier.EXPECT().
				Verify(gomock.Cond(func(x *Payment) bool {
					return x.Token == token && x.Amount == amount
				})).
				Return(StatusInvalidToken)

			e.POST("/payment").
				WithJSON(map[string]any{
					"token":  token,
					"amount": amount,
				}).
				Expect().
				Status(http.StatusBadRequest).
				JSON().Object().IsEqual(map[string]string{"message": "決済トークンが無効です"})
		})
	})
}
