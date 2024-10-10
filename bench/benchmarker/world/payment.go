package world

import (
	"github.com/isucon/isucon14/bench/internal/concurrent"
	"github.com/isucon/isucon14/bench/payment"
)

type PaymentDB struct {
	PaymentTokens     *concurrent.SimpleMap[string, *User]
	CommittedPayments *concurrent.SimpleSlice[*payment.Payment]
}

func NewPaymentDB() *PaymentDB {
	return &PaymentDB{
		PaymentTokens:     concurrent.NewSimpleMap[string, *User](),
		CommittedPayments: concurrent.NewSimpleSlice[*payment.Payment](),
	}
}

func (db *PaymentDB) Verify(p *payment.Payment) payment.Status {
	_, ok := db.PaymentTokens.Get(p.Token)
	if !ok {
		return payment.StatusInvalidToken
	}
	if p.Amount <= 0 && p.Amount > 1_000_000 {
		return payment.StatusInvalidAmount
	}
	db.CommittedPayments.Append(p)
	return payment.StatusSuccess
}
