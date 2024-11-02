package payment

import (
	"net/http"
	"time"

	"github.com/isucon/isucon14/bench/internal/concurrent"
)

const IdempotencyKeyHeader = "Idempotency-Key"
const AuthorizationHeader = "Authorization"
const AuthorizationHeaderPrefix = "Bearer "

type Server struct {
	mux       *http.ServeMux
	knownKeys *concurrent.SimpleMap[string, *Payment]
	queue     paymentQueue
	closed    bool
	done      chan struct{}
}

func NewServer(verifier Verifier, processTime time.Duration, queueSize int) *Server {
	s := &Server{
		mux:       http.NewServeMux(),
		knownKeys: concurrent.NewSimpleMap[string, *Payment](),
		queue:     *newPaymentQueue(queueSize, verifier, processTime),
	}
	s.mux.HandleFunc("GET /payments", s.GetPaymentsHandler)
	s.mux.HandleFunc("POST /payments", s.PostPaymentsHandler)
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if s.closed {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	s.mux.ServeHTTP(w, r)
}

func (s *Server) Close() {
	s.closed = true
	s.queue.close()
}
