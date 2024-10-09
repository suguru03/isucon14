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
	Locked         atomic.Bool
	ProcessChan    chan struct{}
}

func NewPayment(idk string) *Payment {
	p := &Payment{
		IdempotencyKey: idk,
		Status:         StatusInitial,
		ProcessChan:    make(chan struct{}),
	}
	p.Locked.Store(true)
	return p
}
