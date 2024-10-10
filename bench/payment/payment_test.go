package payment

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewPayment(t *testing.T) {
	p := NewPayment("test")
	assert.Equal(t, "test", p.IdempotencyKey)
	assert.Equal(t, StatusInitial, p.Status)
	assert.True(t, p.locked.Load())
	assert.NotNil(t, p.processChan)
	assert.NotPanics(t, func() { close(p.processChan) })
}
