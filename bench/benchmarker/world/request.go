package world

import (
	"fmt"
	"strconv"

	"github.com/guregu/null/v5"
)

const (
	// InitialFare 初乗り運賃
	InitialFare = 500
	// FarePerDistance １距離あたりの運賃
	FarePerDistance = 100
)

type RequestStatus int

const (
	RequestStatusMatching RequestStatus = iota
	RequestStatusDispatching
	RequestStatusDispatched
	RequestStatusCarrying
	RequestStatusArrived
	RequestStatusCompleted
	RequestStatusCanceled
)

type RequestID int

type Request struct {
	// ID ベンチマーカー内部リクエストID
	ID RequestID
	// ServerID サーバー上でのリクエストID
	ServerID string
	// User リクエストしたユーザー
	User *User
	// PickupPoint 配椅子位置
	PickupPoint Coordinate
	// DestinationPoint 目的地
	DestinationPoint Coordinate
	// RequestedAt リクエストを行った時間
	RequestedAt int64

	// Chair 割り当てられた椅子。割り当てられるまでnil
	Chair *Chair
	// StartPoint 椅子の初期位置。割り当てられるまでnil
	StartPoint null.Value[Coordinate]
	// MatchedAt マッチングが完了した時間。割り当てられるまで0
	MatchedAt int64
	// DispatchedAt 配椅子位置についた時間。割り当てられるまで0
	DispatchedAt int64
	// PickedUpAt ピックアップされ出発された時間。割り当てられるまで0
	PickedUpAt int64
	// ArrivedAt 目的地に到着した時間。割り当てられるまで0
	ArrivedAt int64
	// CompletedAt リクエストが正常に完了した時間。割り当てられるまで0
	CompletedAt int64

	// DesiredStatus 現在の想定されるリクエストステータス
	DesiredStatus RequestStatus
	// ChairStatus 現在椅子が認識しているステータス
	ChairStatus RequestStatus
	// UserStatus 現在ユーザーが認識しているステータス
	UserStatus RequestStatus
}

func (r *Request) String() string {
	chairID := "<nil>"
	if r.Chair != nil {
		chairID = strconv.Itoa(int(r.Chair.ID))
	}
	return fmt.Sprintf(
		"Request{id=%d,status=%d,user=%d,from=%s,to=%s,chair=%s,time=[%d,%d,%d,%d,%d,%d]}",
		r.ID, r.DesiredStatus, r.User.ID, r.PickupPoint, r.DestinationPoint, chairID,
		r.RequestedAt, r.MatchedAt, r.DispatchedAt, r.PickedUpAt, r.ArrivedAt, r.CompletedAt,
	)
}

func (r *Request) SetID(id RequestID) {
	r.ID = id
}

// Fare 料金
func (r *Request) Fare() int {
	// TODO 料金計算
	return InitialFare + r.PickupPoint.DistanceTo(r.DestinationPoint)*FarePerDistance
}
