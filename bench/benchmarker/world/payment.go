package world

import (
	"github.com/isucon/isucon14/bench/internal/concurrent"
	"github.com/isucon/isucon14/bench/payment"
	"github.com/samber/lo"
)

type PaymentDB struct {
	PaymentTokens     *concurrent.SimpleMap[string, *User]
	CommittedPayments *concurrent.SimpleMap[RequestID, *payment.Payment]
}

func NewPaymentDB() *PaymentDB {
	return &PaymentDB{
		PaymentTokens:     concurrent.NewSimpleMap[string, *User](),
		CommittedPayments: concurrent.NewSimpleMap[RequestID, *payment.Payment](),
	}
}

func (db *PaymentDB) Verify(p *payment.Payment) payment.Status {
	user, ok := db.PaymentTokens.Get(p.Token)
	if !ok {
		return payment.StatusInvalidToken
	}
	req := user.Request
	if req == nil {
		return payment.StatusRequestNotFound
	}
	if req.Fare() != p.Amount {
		return payment.StatusInvalidAmount
	}
	_, set := db.CommittedPayments.GetOrSetDefault(req.ID, func() *payment.Payment { return p })
	if !set {
		return payment.StatusAlreadyCommitted
	}
	return payment.StatusSuccess
}

func (db *PaymentDB) TotalPayment() int64 {
	return lo.SumBy(db.CommittedPayments.ToSlice(), func(p *payment.Payment) int64 { return int64(p.Amount) })
}
