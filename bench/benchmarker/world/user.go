package world

import (
	"fmt"
	"log"
	"math/rand/v2"
	"sync/atomic"

	"github.com/isucon/isucon14/bench/internal/concurrent"
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
	// notificationQueue 通知キュー。毎Tickで最初に処理される
	notificationQueue chan NotificationEvent

	// Rand 専用の乱数
	Rand *rand.Rand
	// tickDone 行動が完了しているかどうか
	tickDone atomic.Bool
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
	if !u.tickDone.CompareAndSwap(true, false) {
		return nil
	}
	defer func() {
		swapped := u.tickDone.CompareAndSwap(false, true)
		if !swapped {
			// TODO: panic をやめる
			panic("2重でUserのTickが終了した")
		}
	}()

	// 通知キューを順番に処理する
	for event := range concurrent.TryIter(u.notificationQueue) {
		err := u.HandleNotification(event)
		if err != nil {
			return err
		}
	}

	switch {
	// 進行中のリクエストが存在
	case u.Request != nil:
		switch u.Request.Statuses.User {
		case RequestStatusMatching:
			// マッチングされるまで待機する
			// 一向にマッチングされない場合は、このユーザーの行動はハングする
			break

		case RequestStatusDispatching:
			// 椅子が到着するまで待つ
			// 一向に到着しない場合は、このユーザーの行動はハングする
			break

		case RequestStatusDispatched:
			// 椅子が出発するのを待つ
			// 一向に到着しない場合は、このユーザーの行動はハングする
			break

		case RequestStatusCarrying:
			// 椅子が到着するのを待つ
			// 一向に到着しない場合は、このユーザーの行動はハングする
			break

		case RequestStatusArrived:
			// 送迎の評価を行う
			// TODO 評価を送る
			log.Printf("evaluation: %v", u.Request.CalculateEvaluation())
			err := ctx.client.SendEvaluation(ctx, u.Request)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToEvaluate, err)
			}

			// サーバーが評価を受理したので完了状態にする
			u.Request.Statuses.Desired = RequestStatusCompleted
			u.Request.Statuses.User = RequestStatusCompleted

		case RequestStatusCompleted:
			fmt.Println("[COMPLETED] userID:", u.ID, "requestID:", u.Request.ID, "request.User.ID", u.Request.User.ID, "UserStatus:", u.Request.Statuses.User, "ChairStatus:", u.Request.Statuses.Chair, "DesiredStatus:", u.Request.Statuses.Desired, "user.Request == nil: ", u.Request == nil)
			// 進行中のリクエストが無い状態にする
			u.Request = nil

		case RequestStatusCanceled:
			fmt.Println("[CANCELED] userID:", u.ID, "requestID:", u.Request.ID, "request.User.ID", u.Request.User.ID, "UserStatus:", u.Request.Statuses.User, "ChairStatus:", u.Request.Statuses.Chair, "DesiredStatus:", u.Request.Statuses.Desired, "user.Request == nil: ", u.Request == nil)
			// サーバー側でリクエストがキャンセルされた
			u.Request.Statuses.Desired = RequestStatusCanceled

			// 進行中のリクエストが無い状態にする
			u.Request = nil
			return CodeError(ErrorCodeRequestCanceledByServer)
		}

	// 進行中のリクエストは存在しないが、ユーザーがアクティブ状態
	case u.Request == nil && u.State == UserStateActive:
		if u.NotificationConn == nil {
			// 通知コネクションが無い場合は繋いでおく
			conn, err := ctx.client.ConnectUserNotificationStream(ctx, u, func(event NotificationEvent) {
				if !concurrent.TrySend(u.notificationQueue, event) {
					log.Printf("通知受け取りチャンネルが詰まってる: user server id: %s", u.ServerID)
					u.notificationQueue <- event
				}
			})
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
	fmt.Println("[CREATE REQUEST] userID:", u.ID, "userServerID:", u.ServerID, "user.Request == nil:", u.Request == nil)

	// TODO 目的地の決定方法をランダムじゃなくする
	pickup := RandomCoordinateOnRegionWithRand(u.Region, u.Rand)
	dest := RandomCoordinateAwayFromHereWithRand(pickup, u.Rand.IntN(100)+5, u.Rand)

	req := &Request{
		User:             u,
		PickupPoint:      pickup,
		DestinationPoint: dest,
		RequestedAt:      ctx.world.Time,
		Statuses: RequestStatuses{
			Desired: RequestStatusMatching,
			Chair:   RequestStatusMatching,
			User:    RequestStatusMatching,
		},
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
		return WrapCodeError(ErrorCodeUserNotRequestingButStatusChanged, fmt.Errorf("user server id: %s, got: %v", u.ServerID, status))
	}
	if status != RequestStatusCanceled && request.Statuses.User != status && request.Statuses.Desired != status {
		// キャンセル以外で、現在認識しているユーザーの状態で無いかつ、想定状態ではない状態に遷移しようとしている場合
		if request.Statuses.User == RequestStatusMatching && request.Statuses.Desired == RequestStatusDispatched {
			// ユーザーにDispatchingが送られる前に、椅子が到着している場合があるが、その時にDispatchingを受け取ることを許容する
		} else {
			return WrapCodeError(ErrorCodeUnexpectedUserRequestStatusTransitionOccurred, fmt.Errorf("request server id: %v, expect: %v, got: %v (current: %v)", request.ServerID, request.Statuses.Desired, status, request.Statuses.User))
		}
	}
	request.Statuses.User = status
	return nil
}

func (u *User) HandleNotification(event NotificationEvent) error {
	switch event.(type) {
	case *UserNotificationEventDispatching:
		err := u.ChangeRequestStatus(RequestStatusDispatching)
		if err != nil {
			return err
		}
	case *UserNotificationEventDispatched:
		err := u.ChangeRequestStatus(RequestStatusDispatched)
		if err != nil {
			return err
		}
	case *UserNotificationEventCarrying:
		err := u.ChangeRequestStatus(RequestStatusCarrying)
		if err != nil {
			return err
		}
	case *UserNotificationEventArrived:
		err := u.ChangeRequestStatus(RequestStatusArrived)
		if err != nil {
			return err
		}
	case *UserNotificationEventCanceled:
		err := u.ChangeRequestStatus(RequestStatusCanceled)
		if err != nil {
			return err
		}
	}
	return nil
}
