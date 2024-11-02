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
	mux         *http.ServeMux
	knownKeys   *concurrent.SimpleMap[string, *Payment]
	queue       chan *Payment
	verifier    Verifier
	processTime time.Duration
	closed      bool
	done        chan struct{}
}

func NewServer(verifier Verifier, processTime time.Duration, queueSize int) *Server {
	s := &Server{
		mux:         http.NewServeMux(),
		knownKeys:   concurrent.NewSimpleMap[string, *Payment](),
		queue:       make(chan *Payment, queueSize),
		verifier:    verifier,
		processTime: processTime,
	}
	s.mux.HandleFunc("POST /payments", s.PostPaymentsHandler)
	go s.processPaymentLoop()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if s.closed {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	s.mux.ServeHTTP(w, r)
}

func (s *Server) processPaymentLoop() {
	for p := range s.queue {
		time.Sleep(s.processTime)
		p.Status = s.verifier.Verify(p)
		close(p.processChan)
	}
	close(s.done)
}

func (s *Server) Close() {
	s.closed = true
	close(s.queue)
	<-s.done
}
