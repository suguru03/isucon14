package world

import (
	"fmt"
	"log/slog"
	"math/rand/v2"
	"slices"

	"github.com/guregu/null/v5"
	"github.com/isucon/isucon14/bench/internal/concurrent"
)

type ChairState int

const (
	ChairStateInactive ChairState = iota
	ChairStateActive
)

type ChairID int

type Chair struct {
	// ID ベンチマーカー内部椅子ID
	ID ChairID
	// ServerID サーバー上での椅子ID
	ServerID string
	// Region 椅子がいる地域
	Region *Region
	// Provider 椅子を所有している事業者
	Provider *Provider
	// Current 現在地
	Current Coordinate
	// Speed 椅子の単位時間あたりの移動距離
	Speed int
	// State 椅子の状態
	State ChairState
	// WorkTime 稼働時刻
	WorkTime Interval[int]

	// ServerRequestID 進行中のリクエストのサーバー上でのID
	ServerRequestID null.String
	// Request 進行中のリクエスト
	Request *Request
	// RequestHistory 引き受けたリクエストの履歴
	RequestHistory []*Request
	// oldRequest Completedだが後処理されてないRequest
	oldRequest *Request

	// RegisteredData サーバーに登録されている椅子情報
	RegisteredData RegisteredChairData
	// NotificationConn 通知ストリームコネクション
	NotificationConn NotificationStream
	// notificationQueue 通知キュー。毎Tickで最初に処理される
	notificationQueue chan NotificationEvent

	// Client webappへのクライアント
	Client ChairClient
	// Rand 専用の乱数
	Rand *rand.Rand
	// tickDone 行動が完了しているかどうか
	tickDone tickDone
}

type RegisteredChairData struct {
	Name  string
	Model string
}

func (c *Chair) String() string {
	return fmt.Sprintf("Chair{id=%d,c=%s}", c.ID, c.Current)
}

func (c *Chair) SetID(id ChairID) {
	c.ID = id
}

func (c *Chair) Tick(ctx *Context) error {
	if c.tickDone.DoOrSkip() {
		return nil
	}
	defer c.tickDone.Done()

	// 後処理ができていないリクエストがあれば対応する
	if c.oldRequest != nil {
		if c.oldRequest.Statuses.Chair == RequestStatusCompleted {
			// 完了時間を記録
			c.oldRequest.CompletedAt = ctx.world.Time
			ctx.world.CompletedRequestChan <- c.oldRequest
			c.oldRequest = nil
		} else {
			panic("想定していないステータス")
		}
	}

	// 通知キューを順番に処理する
	for event := range concurrent.TryIter(c.notificationQueue) {
		err := c.HandleNotification(event)
		if err != nil {
			return err
		}
	}

	moved := false

	switch {
	// 進行中のリクエストが存在
	case c.Request != nil:
		switch c.Request.Statuses.Chair {
		case RequestStatusMatching:
			// 配椅子要求を受理するか、拒否する
			if c.isRequestAcceptable(c.Request, ctx.world.TimeOfDay) {
				c.Request.Statuses.Lock()

				err := c.Client.SendAcceptRequest(ctx, c, c.Request)
				if err != nil {
					c.Request.Statuses.Unlock()

					return WrapCodeError(ErrorCodeFailedToAcceptRequest, err)
				}

				// サーバーに要求を受理の通知が通ったので配椅子地に向かう
				c.Request.Chair = c
				c.Request.Statuses.Desired = RequestStatusDispatching
				c.Request.Statuses.Chair = RequestStatusDispatching
				c.Request.StartPoint = null.ValueFrom(c.Current)
				c.Request.MatchedAt = ctx.world.Time

				c.Request.Statuses.Unlock()

				c.RequestHistory = append(c.RequestHistory, c.Request)
			} else {
				err := c.Client.SendDenyRequest(ctx, c, c.Request.ServerID)
				if err != nil {
					return WrapCodeError(ErrorCodeFailedToDenyRequest, err)
				}

				// サーバーに要求を拒否の通知が通ったので状態をリセット
				c.Request = nil
				c.ServerRequestID = null.String{}
			}

		case RequestStatusDispatching:
			// 配椅子位置に向かう
			c.moveToward(c.Request.PickupPoint)
			moved = true
			if c.Current.Equals(c.Request.PickupPoint) {
				// 配椅子位置に到着
				c.Request.Statuses.Desired = RequestStatusDispatched
				c.Request.Statuses.Chair = RequestStatusDispatched
				c.Request.DispatchedAt = ctx.world.Time
			}

		case RequestStatusDispatched:
			// 乗客を乗せて出発しようとする
			if c.Request.Statuses.User != RequestStatusDispatched {
				// ただし、ユーザーに到着通知が行っていないとユーザーは乗らない振る舞いをするので
				// ユーザー側の状態が変わるまで待機する
				// 一向にユーザーの状態が変わらない場合は、この椅子の行動はハングする
				break
			}

			err := c.Client.SendDepart(ctx, c.Request)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToDepart, err)
			}

			// サーバーがdepartを受理したので出発する
			c.Request.Statuses.Desired = RequestStatusCarrying
			c.Request.Statuses.Chair = RequestStatusCarrying
			c.Request.PickedUpAt = ctx.world.Time

		case RequestStatusCarrying:
			// 目的地に向かう
			c.moveToward(c.Request.DestinationPoint)
			moved = true
			if c.Current.Equals(c.Request.DestinationPoint) {
				// 目的地に到着
				c.Request.Statuses.Desired = RequestStatusArrived
				c.Request.Statuses.Chair = RequestStatusArrived
				c.Request.ArrivedAt = ctx.world.Time
				break
			}

		case RequestStatusArrived:
			// 客が評価するまで待機する
			// 一向に評価されない場合は、この椅子の行動はハングする
			break

		case RequestStatusCompleted:
			// 進行中のリクエストが無い状態にする
			c.Request = nil
			c.ServerRequestID = null.String{}

		case RequestStatusCanceled:
			// サーバー側でリクエストがキャンセルされた

			// 進行中のリクエストが無い状態にする
			c.Request = nil
			c.ServerRequestID = null.String{}
		}

	// オファーされたリクエストが存在するが、詳細を未取得
	case c.Request == nil && c.ServerRequestID.Valid:
		req := ctx.world.RequestDB.GetByServerID(c.ServerRequestID.String)
		if req == nil {
			// ベンチマーク外で作成されたリクエストがアサインされた場合は処理できないので一律で拒否る
			err := c.Client.SendDenyRequest(ctx, c, c.ServerRequestID.String)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToDenyRequest, err)
			}

			c.ServerRequestID = null.String{}
		} else {
			// TODO detailレスポンス検証
			_, err := c.Client.GetRequestByChair(ctx, c, c.ServerRequestID.String)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToGetRequestDetail, err)
			}

			// 椅子がリクエストを正常に認識する
			c.Request = req
		}

	// 進行中のリクエストが存在せず、稼働中
	case c.State == ChairStateActive:
		if !c.WorkTime.Include(ctx.world.TimeOfDay) {
			// 稼働時刻を過ぎたので退勤する
			err := c.Client.SendDeactivate(ctx, c)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToDeactivate, err)
			}

			// 退勤
			c.State = ChairStateInactive
			// 通知コネクションを切断
			c.NotificationConn.Close()
			c.NotificationConn = nil
		}

	// 未稼働
	case c.State == ChairStateInactive:
		if c.WorkTime.Include(ctx.world.TimeOfDay) {
			// 稼働時刻になっているので出勤する

			if c.NotificationConn == nil {
				// 先に通知コネクションを繋いでおく
				conn, err := c.Client.ConnectChairNotificationStream(ctx, c, func(event NotificationEvent) {
					if !concurrent.TrySend(c.notificationQueue, event) {
						slog.Error("通知受け取りチャンネルが詰まってる", slog.String("chair_server_id", c.ServerID))
						c.notificationQueue <- event
					}
				})
				if err != nil {
					return WrapCodeError(ErrorCodeFailedToConnectNotificationStream, err)
				}
				c.NotificationConn = conn
			}

			err := c.Client.SendActivate(ctx, c)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToActivate, err)
			}

			// 出勤
			c.State = ChairStateActive
			moved = true

			// FIXME activateされてから座標が送信される前に最終出勤時の座標でマッチングされてしまう場合の対応
		}
	}

	if c.State == ChairStateActive && moved {
		// 稼働中かつ動いた場合に自身の座標をサーバーに送信
		err := c.Client.SendChairCoordinate(ctx, c)
		if err != nil {
			return WrapCodeError(ErrorCodeFailedToSendChairCoordinate, err)
		}
	}
	return nil
}

func (c *Chair) AssignRequest(serverRequestID string) error {
	if c.ServerRequestID.Valid && c.ServerRequestID.String != serverRequestID {
		if c.Request != nil && c.ServerRequestID.String == c.Request.ServerID {
			request := c.Request
			// 椅子が別のリクエストを保持している
			switch {
			case request.Statuses.Chair == RequestStatusCompleted:
				// 既に完了状態の場合はベンチマーカーの処理が遅れているだけのため、アサインが可能
				// 後処理を次のTickで完了させるために退避させる
				c.oldRequest = request
				c.Request = nil
			default:
				return WrapCodeError(ErrorCodeChairAlreadyHasRequest, fmt.Errorf("server chair id: %s, current request: %s (%v), got: %s", c.ServerID, c.ServerRequestID.String, request, serverRequestID))
			}
		} else {
			return WrapCodeError(ErrorCodeChairAlreadyHasRequest, fmt.Errorf("server chair id: %s, current request: %s (%v), got: %s", c.ServerID, c.ServerRequestID.String, c.Request, serverRequestID))
		}
	}
	c.ServerRequestID = null.StringFrom(serverRequestID)
	return nil
}

func (c *Chair) moveToward(target Coordinate) {
	// ランダムにx, y方向で近づける
	x := c.Rand.IntN(c.Speed + 1)
	y := c.Speed - x
	remain := 0

	switch {
	case c.Current.X < target.X:
		xDiff := target.X - (c.Current.X + x)
		if xDiff < 0 {
			// X座標で追い越すので、追い越す分をyの移動に加える
			c.Current.X = target.X
			y += -xDiff
		} else {
			c.Current.X += x
		}
	case c.Current.X > target.X:
		xDiff := (c.Current.X - x) - target.X
		if xDiff < 0 {
			// X座標で追い越すので、追い越す分をyの移動に加える
			c.Current.X = target.X
			y += -xDiff
		} else {
			c.Current.X -= x
		}
	default:
		y = c.Speed
	}

	switch {
	case c.Current.Y < target.Y:
		yDiff := target.Y - (c.Current.Y + y)
		if yDiff < 0 {
			c.Current.Y = target.Y
			remain += -yDiff
		} else {
			c.Current.Y += y
		}
	case c.Current.Y > target.Y:
		yDiff := (c.Current.Y - y) - target.Y
		if yDiff < 0 {
			c.Current.Y = target.Y
			remain += -yDiff
		} else {
			c.Current.Y -= y
		}
	default:
		remain = y
	}

	if remain > 0 {
		x = remain
		switch {
		case c.Current.X < target.X:
			xDiff := target.X - (c.Current.X + x)
			if xDiff < 0 {
				c.Current.X = target.X
			} else {
				c.Current.X += x
			}
		case c.Current.X > target.X:
			xDiff := (c.Current.X - x) - target.X
			if xDiff < 0 {
				c.Current.X = target.X
			} else {
				c.Current.X -= x
			}
		}
	}
}

func (c *Chair) moveRandom() {
	// 移動量の決定
	x := c.Rand.IntN(c.Speed + 1)
	y := c.Speed - x

	// 移動方向の決定
	left, right := c.Region.RangeX()
	bottom, top := c.Region.RangeY()

	switch c.Rand.IntN(4) {
	case 0:
		x *= -1
		if c.Current.X+x < left {
			x *= -1 // 逆側に戻す
		}
		if top < c.Current.Y+y {
			y *= -1 // 逆側に戻す
		}
	case 1:
		y *= -1
		if right < c.Current.X+x {
			x *= -1 // 逆側に戻す
		}
		if c.Current.Y+y < bottom {
			y *= -1 // 逆側に戻す
		}
	case 2:
		x *= -1
		y *= -1
		if c.Current.X+x < left {
			x *= -1 // 逆側に戻す
		}
		if c.Current.Y+y < bottom {
			y *= -1 // 逆側に戻す
		}
	case 3:
		if right < c.Current.X+x {
			x *= -1 // 逆側に戻す
		}
		if top < c.Current.Y+y {
			y *= -1 // 逆側に戻す
		}
		break
	}

	c.Current = C(c.Current.X+x, c.Current.Y+y)
}

func (c *Chair) isRequestAcceptable(req *Request, timeOfDay int) bool {
	if c.State != ChairStateActive {
		// 稼働してないなら拒否
		return false
	}

	// リクエスト完了までに最低限必要な時間
	t := neededTime(c.Current.DistanceTo(req.PickupPoint)+req.PickupPoint.DistanceTo(req.DestinationPoint), c.Speed)
	if !c.WorkTime.Include(timeOfDay + t) {
		// 到着する前に稼働時間を過ぎることが確実な場合は拒否
		return false
	}

	return true
}

func (c *Chair) HandleNotification(event NotificationEvent) error {
	switch data := event.(type) {
	case *ChairNotificationEventMatched:
		err := c.AssignRequest(data.ServerRequestID)
		if err != nil {
			return err
		}

	case *ChairNotificationEventCompleted:
		request := c.Request
		if request == nil {
			// 履歴を見て、過去扱っていたRequestに向けてのCOMPLETED通知であれば無視する
			for _, r := range slices.Backward(c.RequestHistory) {
				if r.ServerID == data.ServerRequestID && r.Statuses.Desired == RequestStatusCompleted {
					r.Statuses.Chair = RequestStatusCompleted
					return nil
				}
			}
			return WrapCodeError(ErrorCodeChairNotAssignedButStatusChanged, fmt.Errorf("request server id: %v (oldRequest: %v)", data.ServerRequestID, c.oldRequest))
		}
		if request.Statuses.Desired != RequestStatusCompleted {
			return WrapCodeError(ErrorCodeUnexpectedChairRequestStatusTransitionOccurred, fmt.Errorf("request server id: %v, expect: %v, got: %v", request.ServerID, request.Statuses.Desired, RequestStatusCompleted))
		}
		request.Statuses.Chair = RequestStatusCompleted
	}
	return nil
}
