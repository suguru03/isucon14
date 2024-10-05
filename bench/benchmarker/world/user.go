package world

import (
	"errors"
	"fmt"
	"math/rand/v2"
)

type UserState int

const (
	UserStateInactive UserState = iota
	UserStateActive
)

type UserID int

type User struct {
	// ID ベンチマーカー内部ユーザーID
	ID UserID
	// ServerID サーバー上でのユーザーID
	ServerID string
	// Region ユーザーが居る地域
	Region *Region
	// State ユーザーの状態
	State UserState
	// Request 進行中の配椅子・送迎リクエスト
	Request *Request

	// RegisteredData サーバーに登録されているユーザー情報
	RegisteredData RegisteredUserData
	// AccessToken サーバーアクセストークン
	AccessToken string
	// RequestHistory リクエスト履歴
	RequestHistory []*Request
	// NotificationConn 通知ストリームコネクション
	NotificationConn NotificationStream
	// NotificationHandleErrors 通知処理によって発生した未処理のエラー
	NotificationHandleErrors []error

	// Rand 専用の乱数
	Rand *rand.Rand
}

type RegisteredUserData struct {
	UserName    string
	FirstName   string
	LastName    string
	DateOfBirth string
}

func (u *User) String() string {
	if u.Request != nil {
		return fmt.Sprintf("User{id=%d,totalReqs=%d,reqId=%d}", u.ID, len(u.RequestHistory), u.Request.ID)
	}
	return fmt.Sprintf("User{id=%d,totalReqs=%d}", u.ID, len(u.RequestHistory))
}

func (u *User) SetID(id UserID) {
	u.ID = id
}

func (u *User) Tick(ctx *Context) error {
	switch {
	// 通知処理にエラーが発生している
	case len(u.NotificationHandleErrors) > 0:
		// TODO この処理に1tick使って良いか考える
		err := errors.Join(u.NotificationHandleErrors...)
		u.NotificationHandleErrors = u.NotificationHandleErrors[:0] // 配列クリア
		return err

	// 進行中のリクエストが存在
	case u.Request != nil:
		switch u.Request.UserStatus {
		case RequestStatusMatching:
			// マッチングされるまで待機する
			break

		case RequestStatusDispatching:
			// 椅子が到着するまで待つ
			// TODO: 椅子が一向に到着しない場合の対応
			break

		case RequestStatusDispatched:
			// 椅子が出発するのを待つ
			// TODO: 椅子が一向に出発しない場合の対応
			break

		case RequestStatusCarrying:
			// 椅子が到着するのを待つ
			// TODO: 椅子が一向に到着しない場合の対応
			break

		case RequestStatusArrived:
			// 送迎の評価を行う
			err := ctx.client.SendEvaluation(ctx, u.Request)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToEvaluate, err)
			}

			// サーバーが評価を受理したので完了状態にする
			u.Request.DesiredStatus = RequestStatusCompleted
			u.Request.UserStatus = RequestStatusCompleted

		case RequestStatusCompleted:
			// 進行中のリクエストが無い状態にする
			u.Request = nil

		case RequestStatusCanceled:
			// サーバー側でリクエストがキャンセルされた
			u.Request.DesiredStatus = RequestStatusCanceled

			// 進行中のリクエストが無い状態にする
			u.Request = nil

			// TODO: キャンセルペナルティ
		}

	// 進行中のリクエストは存在しないが、ユーザーがアクティブ状態
	case u.Request == nil && u.State == UserStateActive:
		if u.NotificationConn == nil {
			// 通知コネクションが無い場合は繋いでおく
			conn, err := ctx.client.ConnectUserNotificationStream(ctx, u, u.HandleNotification)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToConnectNotificationStream, err)
			}
			u.NotificationConn = conn
		}

		// リクエストを作成する
		// TODO 作成する条件・頻度
		err := u.CreateRequest(ctx)
		if err != nil {
			return err
		}
	}
	return nil
}

func (u *User) CreateRequest(ctx *Context) error {
	if u.Request != nil {
		panic("ユーザーに進行中のリクエストがあるのにも関わらず、リクエストを新規作成しようとしている")
	}

	// TODO 目的地の決定方法をランダムじゃなくする
	pickup := RandomCoordinateOnRegionWithRand(u.Region, u.Rand)
	dest := RandomCoordinateAwayFromHereWithRand(pickup, u.Rand.IntN(100)+5, u.Rand)

	req := &Request{
		User:             u,
		PickupPoint:      pickup,
		DestinationPoint: dest,
		RequestedAt:      ctx.world.Time,
		DesiredStatus:    RequestStatusMatching,
		ChairStatus:      RequestStatusMatching,
		UserStatus:       RequestStatusMatching,
	}
	res, err := ctx.client.SendCreateRequest(ctx, req)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToCreateRequest, err)
	}
	req.ServerID = res.ServerRequestID
	u.Request = req
	u.RequestHistory = append(u.RequestHistory, req)
	ctx.world.RequestDB.Create(req)
	return nil
}

func (u *User) ChangeRequestStatus(status RequestStatus) error {
	request := u.Request
	if request == nil {
		return CodeError(ErrorCodeUserNotRequestingButStatusChanged)
	}
	if status != RequestStatusCanceled && request.DesiredStatus != status {
		return WrapCodeError(ErrorCodeUnexpectedUserRequestStatusTransitionOccurred, fmt.Errorf("request server id: %v, expect: %v, got: %v", request.ServerID, request.DesiredStatus, status))
	}
	request.UserStatus = status
	return nil
}

func (u *User) HandleNotification(event NotificationEvent) {
	switch event.(type) {
	case *UserNotificationEventDispatching:
		err := u.ChangeRequestStatus(RequestStatusDispatching)
		if err != nil {
			u.NotificationHandleErrors = append(u.NotificationHandleErrors, err)
		}
	case *UserNotificationEventDispatched:
		err := u.ChangeRequestStatus(RequestStatusDispatched)
		if err != nil {
			u.NotificationHandleErrors = append(u.NotificationHandleErrors, err)
		}
	case *UserNotificationEventCarrying:
		err := u.ChangeRequestStatus(RequestStatusCarrying)
		if err != nil {
			u.NotificationHandleErrors = append(u.NotificationHandleErrors, err)
		}
	case *UserNotificationEventArrived:
		err := u.ChangeRequestStatus(RequestStatusArrived)
		if err != nil {
			u.NotificationHandleErrors = append(u.NotificationHandleErrors, err)
		}
	case *UserNotificationEventCanceled:
		err := u.ChangeRequestStatus(RequestStatusCanceled)
		if err != nil {
			u.NotificationHandleErrors = append(u.NotificationHandleErrors, err)
		}
	}
}
