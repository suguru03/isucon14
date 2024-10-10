// Code generated by MockGen. DO NOT EDIT.
// Source: verifier.go
//
// Generated by this command:
//
//	mockgen -typed -source=verifier.go -package=payment -destination=./mock_verifier.go
//

// Package payment is a generated GoMock package.
package payment

import (
	reflect "reflect"

	gomock "go.uber.org/mock/gomock"
)

// MockVerifier is a mock of Verifier interface.
type MockVerifier struct {
	ctrl     *gomock.Controller
	recorder *MockVerifierMockRecorder
	isgomock struct{}
}

// MockVerifierMockRecorder is the mock recorder for MockVerifier.
type MockVerifierMockRecorder struct {
	mock *MockVerifier
}

// NewMockVerifier creates a new mock instance.
func NewMockVerifier(ctrl *gomock.Controller) *MockVerifier {
	mock := &MockVerifier{ctrl: ctrl}
	mock.recorder = &MockVerifierMockRecorder{mock}
	return mock
}

// EXPECT returns an object that allows the caller to indicate expected use.
func (m *MockVerifier) EXPECT() *MockVerifierMockRecorder {
	return m.recorder
}

// Verify mocks base method.
func (m *MockVerifier) Verify(p *Payment) Status {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Verify", p)
	ret0, _ := ret[0].(Status)
	return ret0
}

// Verify indicates an expected call of Verify.
func (mr *MockVerifierMockRecorder) Verify(p any) *MockVerifierVerifyCall {
	mr.mock.ctrl.T.Helper()
	call := mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Verify", reflect.TypeOf((*MockVerifier)(nil).Verify), p)
	return &MockVerifierVerifyCall{Call: call}
}

// MockVerifierVerifyCall wrap *gomock.Call
type MockVerifierVerifyCall struct {
	*gomock.Call
}

// Return rewrite *gomock.Call.Return
func (c *MockVerifierVerifyCall) Return(arg0 Status) *MockVerifierVerifyCall {
	c.Call = c.Call.Return(arg0)
	return c
}

// Do rewrite *gomock.Call.Do
func (c *MockVerifierVerifyCall) Do(f func(*Payment) Status) *MockVerifierVerifyCall {
	c.Call = c.Call.Do(f)
	return c
}

// DoAndReturn rewrite *gomock.Call.DoAndReturn
func (c *MockVerifierVerifyCall) DoAndReturn(f func(*Payment) Status) *MockVerifierVerifyCall {
	c.Call = c.Call.DoAndReturn(f)
	return c
}
