package payment

import "sync/atomic"

type Status int

const (
	StatusInitial Status = iota
	StatusSuccess
	StatusInvalidAmount
	StatusInvalidToken
)

type Payment struct {
	IdempotencyKey string
	Token          string
	Amount         int
	Status         Status
	locked         atomic.Bool
	processChan    chan struct{}
}

func NewPayment(idk string) *Payment {
	p := &Payment{
		IdempotencyKey: idk,
		Status:         StatusInitial,
		processChan:    make(chan struct{}),
	}
	p.locked.Store(true)
	return p
}
