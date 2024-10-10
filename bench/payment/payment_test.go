package payment

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewPayment(t *testing.T) {
	p := NewPayment("test")
	assert.Equal(t, "test", p.IdempotencyKey)
	assert.Equal(t, StatusInitial, p.Status)
	assert.True(t, p.Locked.Load())
	assert.NotNil(t, p.ProcessChan)
	assert.NotPanics(t, func() { close(p.ProcessChan) })
}
