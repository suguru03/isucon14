package world

import (
	"errors"
	"fmt"
	"math/rand/v2"

	"github.com/guregu/null/v5"
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

	// RegisteredData サーバーに登録されている椅子情報
	RegisteredData RegisteredChairData
	// AccessToken サーバーアクセストークン
	AccessToken string
	// NotificationConn 通知ストリームコネクション
	NotificationConn NotificationStream
	// NotificationHandleErrors 通知処理によって発生した未処理のエラー
	NotificationHandleErrors []error

	// Rand 専用の乱数
	Rand *rand.Rand
}

type RegisteredChairData struct {
	UserName    string
	FirstName   string
	LastName    string
	DateOfBirth string
	ChairModel  string
	ChairNo     string
}

func (c *Chair) String() string {
	return fmt.Sprintf("Chair{id=%d,c=%s}", c.ID, c.Current)
}

func (c *Chair) SetID(id ChairID) {
	c.ID = id
}

func (c *Chair) Tick(ctx *Context) error {
	switch {
	// 通知処理にエラーが発生している
	case len(c.NotificationHandleErrors) > 0:
		// TODO この処理に1tick使って良いか考える
		err := errors.Join(c.NotificationHandleErrors...)
		c.NotificationHandleErrors = c.NotificationHandleErrors[:0] // 配列クリア
		return err

	// 進行中のリクエストが存在
	case c.Request != nil:
		switch c.Request.ChairStatus {
		case RequestStatusMatching:
			// 配椅子要求を受理するか、拒否する
			if c.isRequestAcceptable(c.Request, ctx.world.TimeOfDay) {
				err := ctx.client.SendAcceptRequest(ctx, c, c.Request)
				if err != nil {
					return WrapCodeError(ErrorCodeFailedToAcceptRequest, err)
				}

				// サーバーに要求を受理の通知が通ったので配椅子地に向かう
				c.Request.Chair = c
				c.Request.DesiredStatus = RequestStatusDispatching
				c.Request.ChairStatus = RequestStatusDispatching
				c.Request.StartPoint = null.ValueFrom(c.Current)
				c.Request.MatchedAt = ctx.world.Time
			} else {
				err := ctx.client.SendDenyRequest(ctx, c, c.Request.ServerID)
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
			if c.Current.Equals(c.Request.PickupPoint) {
				// 配椅子位置に到着
				c.Request.DesiredStatus = RequestStatusDispatched
				c.Request.ChairStatus = RequestStatusDispatched
				c.Request.DispatchedAt = ctx.world.Time
			}

		case RequestStatusDispatched:
			// 乗客を乗せて出発しようとする
			if c.Request.UserStatus != RequestStatusDispatched {
				// ただし、ユーザーに到着通知が行っていないとユーザーは乗らない振る舞いをするので
				// ユーザー側の状態が変わるまで待機する
				// TODO 一向にユーザーが乗らない場合の対応
				break
			}

			err := ctx.client.SendDepart(ctx, c.Request)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToDepart, err)
			}

			// サーバーがdepartを受理したので出発する
			c.Request.DesiredStatus = RequestStatusCarrying
			c.Request.ChairStatus = RequestStatusCarrying
			c.Request.PickedUpAt = ctx.world.Time

		case RequestStatusCarrying:
			// 目的地に向かう
			c.moveToward(c.Request.DestinationPoint)
			if c.Current.Equals(c.Request.DestinationPoint) {
				// 目的地に到着
				c.Request.DesiredStatus = RequestStatusArrived
				c.Request.ChairStatus = RequestStatusArrived
				c.Request.ArrivedAt = ctx.world.Time
				break
			}

		case RequestStatusArrived:
			// 客が評価するまで待機する
			// TODO 一向に評価されない場合の対応
			break

		case RequestStatusCompleted:
			// 完了時間を記録
			c.Request.CompletedAt = ctx.world.Time
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
			err := ctx.client.SendDenyRequest(ctx, c, c.ServerRequestID.String)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToDenyRequest, err)
			}

			c.ServerRequestID = null.String{}
		} else {
			// TODO detailレスポンス検証
			_, err := ctx.client.GetRequestByChair(ctx, c, c.ServerRequestID.String)
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
			err := ctx.client.SendDeactivate(ctx, c)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToDeactivate, err)
			}

			// 退勤
			c.State = ChairStateInactive
			// 通知コネクションを切断
			c.NotificationConn.Close()
			c.NotificationConn = nil
		} else {
			// ランダムに徘徊する
			c.moveRandom()
		}

	// 未稼働
	case c.State == ChairStateInactive:
		// TODO 動かし方調整
		// 退勤時の座標と出勤時の座標を変えておきたいためにある程度動かしておく
		c.moveRandom()

		if c.WorkTime.Include(ctx.world.TimeOfDay) {
			// 稼働時刻になっているので出勤する

			if c.NotificationConn == nil {
				// 先に通知コネクションを繋いでおく
				conn, err := ctx.client.ConnectChairNotificationStream(ctx, c, c.HandleNotification)
				if err != nil {
					return WrapCodeError(ErrorCodeFailedToConnectNotificationStream, err)
				}
				c.NotificationConn = conn
			}

			err := ctx.client.SendActivate(ctx, c)
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToActivate, err)
			}

			// 出勤
			c.State = ChairStateActive

			// FIXME activateされてから座標が送信される前に最終出勤時の座標でマッチングされてしまう場合の対応
		}
	}

	if c.State == ChairStateActive {
		// 稼働中なら自身の座標をサーバーに送信
		err := ctx.client.SendChairCoordinate(ctx, c)
		if err != nil {
			return WrapCodeError(ErrorCodeFailedToSendChairCoordinate, err)
		}
	}
	return nil
}

func (c *Chair) ChangeRequestStatus(status RequestStatus) error {
	request := c.Request
	if request == nil {
		return CodeError(ErrorCodeChairNotAssignedButStatusChanged)
	}
	if status != RequestStatusCanceled && request.DesiredStatus != status {
		return CodeError(ErrorCodeUnexpectedChairRequestStatusTransitionOccurred)
	}
	request.ChairStatus = status
	return nil
}

func (c *Chair) AssignRequest(serverRequestID string) error {
	if c.Request != nil || c.ServerRequestID.Valid {
		return CodeError(ErrorCodeChairAlreadyHasRequest)
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
	c.Current = RandomCoordinateAwayFromHereWithRand(c.Current, c.Speed, c.Rand)
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

func (c *Chair) HandleNotification(event NotificationEvent) {
	switch data := event.(type) {
	case *ChairNotificationEventMatched:
		err := c.AssignRequest(data.ServerRequestID)
		if err != nil {
			c.NotificationHandleErrors = append(c.NotificationHandleErrors, err)
		}
	case *ChairNotificationEventCompleted:
		err := c.ChangeRequestStatus(RequestStatusCompleted)
		if err != nil {
			c.NotificationHandleErrors = append(c.NotificationHandleErrors, err)
		}
	}
}
