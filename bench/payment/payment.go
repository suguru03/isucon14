package payment

import (
	"fmt"
	"sync/atomic"
)

type Status int

const (
	StatusInitial Status = iota
	StatusSuccess
	StatusInvalidAmount
	StatusInvalidToken
)

func (s Status) String() string {
	switch s {
	case StatusInitial:
		return "決済処理中"
	case StatusSuccess:
		return "成功"
	case StatusInvalidAmount:
		return "決済額が不正"
	case StatusInvalidToken:
		return "決済トークンが無効"
	default:
		panic(fmt.Sprintf("unknown payment status: %d", s))
	}
}

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
