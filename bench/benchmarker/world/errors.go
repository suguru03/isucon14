package world

import (
	"errors"
	"fmt"
)

type ErrorCode int

const (
	// ErrorCodeFailedToSendChairCoordinate 椅子の座標送信リクエストが失敗した
	ErrorCodeFailedToSendChairCoordinate ErrorCode = iota + 1
	// ErrorCodeFailedToDepart 椅子が出発しようとしたが、departリクエストが失敗した
	ErrorCodeFailedToDepart
	// ErrorCodeFailedToAcceptRequest 椅子がリクエストを受理しようとしたが失敗した
	ErrorCodeFailedToAcceptRequest
	// ErrorCodeFailedToDenyRequest 椅子がリクエストを拒否しようとしたが失敗した
	ErrorCodeFailedToDenyRequest
	// ErrorCodeFailedToEvaluate ユーザーが送迎の評価をしようとしたが失敗した
	ErrorCodeFailedToEvaluate
	// ErrorCodeFailedToCreateRequest ユーザーがリクエストを作成しようとしたが失敗した
	ErrorCodeFailedToCreateRequest
	// ErrorCodeUserNotRequestingButStatusChanged リクエストしていないユーザーのリクエストステータスが更新された
	ErrorCodeUserNotRequestingButStatusChanged
	// ErrorCodeChairNotAssignedButStatusChanged 椅子にリクエストが割り当てられていないのに、椅子のステータスが更新された
	ErrorCodeChairNotAssignedButStatusChanged
	// ErrorCodeUnexpectedUserRequestStatusTransitionOccurred 想定されていないユーザーのRequestStatusの遷移が発生した
	ErrorCodeUnexpectedUserRequestStatusTransitionOccurred
	// ErrorCodeUnexpectedChairRequestStatusTransitionOccurred 想定されていない椅子のRequestStatusの遷移が発生した
	ErrorCodeUnexpectedChairRequestStatusTransitionOccurred
	// ErrorCodeFailedToActivate 椅子がリクエストの受付を開始しようとしたが失敗した
	ErrorCodeFailedToActivate
	// ErrorCodeFailedToDeactivate 椅子がリクエストの受付を停止しようとしたが失敗した
	ErrorCodeFailedToDeactivate
	// ErrorCodeChairAlreadyHasRequest 既にリクエストが割り当てられている椅子に、別のリクエストが割り当てられた
	ErrorCodeChairAlreadyHasRequest
	// ErrorCodeFailedToGetRequestDetail リクエスト詳細の取得が失敗した
	ErrorCodeFailedToGetRequestDetail
	// ErrorCodeFailedToRegisterUser ユーザー登録に失敗した
	ErrorCodeFailedToRegisterUser
	// ErrorCodeFailedToRegisterChair 椅子登録に失敗した
	ErrorCodeFailedToRegisterChair
	// ErrorCodeFailedToConnectNotificationStream 通知ストリームへの接続に失敗した
	ErrorCodeFailedToConnectNotificationStream
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
