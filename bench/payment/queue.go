package payment

import (
	"context"
	"time"

	"github.com/isucon/isucon14/bench/internal/concurrent"
	"golang.org/x/sync/semaphore"
)

type paymentQueue struct {
	ctx              context.Context
	semaphore        *semaphore.Weighted
	verifier         Verifier
	processTime      time.Duration
	acceptedPayments *concurrent.SimpleMap[string, *concurrent.SimpleSlice[*Payment]]
}

func newPaymentQueue(queueSize int, verifier Verifier, processTime time.Duration) *paymentQueue {
	return &paymentQueue{
		ctx:              context.Background(),
		semaphore:        semaphore.NewWeighted(int64(queueSize)),
		verifier:         verifier,
		processTime:      processTime,
		acceptedPayments: concurrent.NewSimpleMap[string, *concurrent.SimpleSlice[*Payment]](),
	}
}

func (q *paymentQueue) execute(p *Payment) {
	time.Sleep(q.processTime)
	p.Status = q.verifier.Verify(p)
	close(p.processChan)
}

func (q *paymentQueue) tryProcess(p *Payment) bool {
	if !q.semaphore.TryAcquire(1) {
		return false
	}
	q.appendAcceptedPayments(p)

	go func() {
		defer q.semaphore.Release(1)
		q.execute(p)
	}()
	return true
}

func (q *paymentQueue) process(p *Payment) {
	// 遅かれ早かれ処理するため、受け入れた決済として保持しておく
	q.appendAcceptedPayments(p)

	q.semaphore.Acquire(q.ctx, 1)
	defer q.semaphore.Release(1)

	q.execute(p)
}

func (q *paymentQueue) appendAcceptedPayments(p *Payment) {
	payments, _ := q.acceptedPayments.GetOrSetDefault(p.Token, func() *concurrent.SimpleSlice[*Payment] { return concurrent.NewSimpleSlice[*Payment]() })
	payments.Append(p)
}

func (q *paymentQueue) getAllAcceptedPayments(token string) []*Payment {
	payments, ok := q.acceptedPayments.Get(token)
	if !ok {
		return []*Payment{}
	}
	return payments.ToSlice()
}

func (q *paymentQueue) close() {
	q.ctx.Done()
}
