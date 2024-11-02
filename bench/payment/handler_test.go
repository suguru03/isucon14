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
		token  string
		req    PostPaymentRequest
		p      *Payment
		expect bool
	}{
		{
			token:	"t1",
			req:    PostPaymentRequest{Amount: 1000},
			p:      &Payment{Token: "t1", Amount: 1000},
			expect: true,
		},
		{
			token:	"t2",
			req:    PostPaymentRequest{Amount: 1000},
			p:      &Payment{Token: "t1", Amount: 1000},
			expect: false,
		},
		{
			token:	"t1",
			req:    PostPaymentRequest{Amount: 10000},
			p:      &Payment{Token: "t1", Amount: 1000},
			expect: false,
		},
	}
	for i, tt := range tests {
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			assert.Equal(t, tt.expect, tt.req.IsSamePayload(tt.token, tt.p))
		})
	}
}

func TestServer_PaymentHandler(t *testing.T) {
	prepare := func(t *testing.T) (*Server, *MockVerifier, *httpexpect.Expect) {
		mockCtrl := gomock.NewController(t)
		verifier := NewMockVerifier(mockCtrl)
		server := NewServer(verifier, 1*time.Millisecond, 1)
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

				e.POST("/payments").
					WithHeader(IdempotencyKeyHeader, "idk1").
					WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
					WithJSON(map[string]any{
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

				e.POST("/payments").
					WithHeader(IdempotencyKeyHeader, "idk1").
					WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
					WithJSON(map[string]any{
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

				e.POST("/payments").
					WithHeader(IdempotencyKeyHeader, "idk1").
					WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
					WithJSON(map[string]any{
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

				e.POST("/payments").
					WithHeader(IdempotencyKeyHeader, idk).
					WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
					WithJSON(map[string]any{
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

				e.POST("/payments").
					WithHeader(IdempotencyKeyHeader, idk).
					WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
					WithJSON(map[string]any{
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
				e.POST("/payments").
					WithHeader(IdempotencyKeyHeader, idk).
					WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
					WithJSON(map[string]any{
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
				e.POST("/payments").
					WithHeader(IdempotencyKeyHeader, idk).
					WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
					WithJSON(map[string]any{
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
			p.locked.Store(true)

			server.knownKeys.Set(idk, p)
			e.POST("/payments").
				WithHeader(IdempotencyKeyHeader, idk).
				WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
				WithJSON(map[string]any{
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

			e.POST("/payments").
				WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
				WithJSON(map[string]any{
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

			e.POST("/payments").
				WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
				WithJSON(map[string]any{
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

			e.POST("/payments").
				WithHeader(AuthorizationHeader, AuthorizationHeaderPrefix+token).
				WithJSON(map[string]any{
					"amount": amount,
				}).
				Expect().
				Status(http.StatusBadRequest).
				JSON().Object().IsEqual(map[string]string{"message": "決済トークンが無効です"})
		})
	})
}
