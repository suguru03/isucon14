package worldclient

import (
	"errors"
	"fmt"
)

type ErrorCode int

const (
	// ErrorCodeNotFoundChairClient ChairClientが見つからないエラー
	ErrorCodeNotFoundChairClient ErrorCode = iota + 10000
	// ErrorCodeNotFoundUserClient UserClientが見つからないエラー
	ErrorCodeNotFoundUserClient
	// ErrorCodeFailedToPostCoordinate 座標送信に失敗したエラー
	ErrorCodeFailedToPostCoordinate
	// ErrorCodeFailedToPostAccept リクエスト受諾に失敗したエラー
	ErrorCodeFailedToPostAccept
	// ErrorCodeFailedToPostDeny リクエスト拒否に失敗したエラー
	ErrorCodeFailedToPostDeny
	// ErrorCodeFailedToPostDepart 出発通知に失敗したエラー
	ErrorCodeFailedToPostDepart
	// ErrorCodeFailedToPostEvaluate 評価送信に失敗したエラー
	ErrorCodeFailedToPostEvaluate
	// ErrorCodeFailedToPostActivate 配車受付の開始に失敗したエラー
	ErrorCodeFailedToPostActivate
	// ErrorCodeFailedToPostDeactivate 配車受付の停止に失敗したエラー
	ErrorCodeFailedToPostDeactivate
	// ErrorCodeFailedToGetDriverRequest 運転手のリクエスト取得に失敗したエラー
	ErrorCodeFailedToGetDriverRequest
	// ErrorCodeFailedToCreateWebappClient WebappClientの作成に失敗したエラー
	ErrorCodeFailedToCreateWebappClient
	// ErrorCodeFailedToRegisterUser ユーザー登録に失敗したエラー
	ErrorCodeFailedToRegisterUser
	// ErrorCodeFailedToRegisterDriver 運転手登録に失敗したエラー
	ErrorCodeFailedToRegisterDriver
	// ErrorCodeFailedToPostRequest リクエスト送信に失敗したエラー
	ErrorCodeFailedToPostRequest
	// ErrorCodeFailedToPostPaymentMethods ユーザー支払い情報登録に失敗したエラー
	ErrorCodeFailedToPostPaymentMethods
)

type codeError struct {
	code ErrorCode
	err  error
}

func (e *codeError) Error() string {
	if e.err == nil {
		return fmt.Sprintf("CODE=%d", e.code)
	}
	return fmt.Sprintf("CODE=%d: %s", e.code, e.err)
}

func (e *codeError) Unwrap() error {
	return e.err
}

func (e *codeError) Code() ErrorCode {
	return e.code
}

func (e *codeError) Is(target error) bool {
	var t *codeError
	if errors.As(target, &t) {
		return t.code == e.code
	}
	return false
}

func WrapCodeError(code ErrorCode, err error) error {
	return &codeError{code, err}
}

func CodeError(code ErrorCode) error {
	return &codeError{code, nil}
}
