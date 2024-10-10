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

func (r RequestStatus) String() string {
	switch r {
	case RequestStatusMatching:
		return "MATCHING"
	case RequestStatusDispatching:
		return "DISPATCHING"
	case RequestStatusDispatched:
		return "DISPATCHED"
	case RequestStatusCarrying:
		return "CARRYING"
	case RequestStatusArrived:
		return "ARRIVED"
	case RequestStatusCompleted:
		return "COMPLETED"
	case RequestStatusCanceled:
		return "CANCELED"
	default:
		return "UNKNOWN"
	}
}

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

	// Chair 割り当てられた椅子。割り当てられるまでnil
	Chair *Chair
	// StartPoint 椅子の初期位置。割り当てられるまでnil
	StartPoint null.Value[Coordinate]

	// RequestedAt リクエストを行った時間
	RequestedAt int64
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

	// Evaluated リクエストの評価が完了しているかどうか
	Evaluated bool

	Statuses RequestStatuses
}

func (r *Request) String() string {
	chairID := "<nil>"
	if r.Chair != nil {
		chairID = strconv.Itoa(int(r.Chair.ID))
	}
	return fmt.Sprintf(
		"Request{id=%d,status=%s,user=%d,from=%s,to=%s,chair=%s,time=%s}",
		r.ID, r.Statuses.String(), r.User.ID, r.PickupPoint, r.DestinationPoint, chairID, r.timelineString(),
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

// CalculateEvaluation 送迎の評価値を計算する
func (r *Request) CalculateEvaluation() Evaluation {
	if !(r.MatchedAt > 0 && r.DispatchedAt > 0 && r.PickedUpAt > 0 && r.ArrivedAt > 0) {
		panic("計算に必要な時間情報が足りていない状況なのに評価値を計算しようとしている")
	}

	// TODO: いい感じにする
	result := Evaluation{}
	{
		// マッチング待ち時間評価
		time := int(r.MatchedAt - r.RequestedAt)
		if time < 100 {
			// 100ticks以内ならOK
			result.Matching = true
		}
	}
	{
		// 配椅子時間評価
		idealTime := neededTime(r.StartPoint.V.DistanceTo(r.PickupPoint), r.Chair.Speed)
		actualTime := int(r.DispatchedAt - r.MatchedAt)
		if actualTime-idealTime < 5 {
			// 理想時間との誤差が5ticks以内ならOK
			result.Dispatch = true
		}
	}
	{
		// 到着待ち時間評価
		time := int(r.PickedUpAt - r.DispatchedAt)
		if time < 10 {
			// 理想時間との誤差が10ticks以内ならOK
			result.Pickup = true
		}
	}
	{
		// 乗車時間評価
		idealTime := neededTime(r.PickupPoint.DistanceTo(r.DestinationPoint), r.Chair.Speed)
		actualTime := int(r.ArrivedAt - r.PickedUpAt)
		if actualTime-idealTime < 5 {
			// 理想時間との誤差が5ticks以内ならOK
			result.Drive = true
		}
	}

	return result
}

func (r *Request) timelineString() string {
	baseTime := r.RequestedAt
	matchTime := max(0, r.MatchedAt-r.RequestedAt)
	dispatchTime := max(0, r.DispatchedAt-r.RequestedAt)
	pickedUpTime := max(0, r.PickedUpAt-r.RequestedAt)
	arrivedTime := max(0, r.ArrivedAt-r.RequestedAt)
	completedTime := max(0, r.CompletedAt-r.RequestedAt)
	return fmt.Sprintf("[0(base=%d),%d,%d,%d,%d,%d]", baseTime, matchTime, dispatchTime, pickedUpTime, arrivedTime, completedTime)
}

type Evaluation struct {
	Matching bool
	Dispatch bool
	Pickup   bool
	Drive    bool
}

func (e Evaluation) String() string {
	return fmt.Sprintf("score: %d (matching: %v, dispath: %v, pickup: %v, drive: %v)", e.Score(), e.Matching, e.Dispatch, e.Pickup, e.Drive)
}

func (e Evaluation) Score() int {
	result := 1
	if e.Matching {
		result++
	}
	if e.Dispatch {
		result++
	}
	if e.Pickup {
		result++
	}
	if e.Drive {
		result++
	}
	return result
}

type RequestStatuses struct {
	// Desired 現在の想定されるリクエストステータス
	Desired RequestStatus
	// Chair 現在椅子が認識しているステータス
	Chair RequestStatus
	// User 現在ユーザーが認識しているステータス
	User RequestStatus
}

func (s *RequestStatuses) String() string {
	d, c, u := s.Get()
	return fmt.Sprintf("(%v,%v,%v)", d, c, u)
}

func (s *RequestStatuses) Get() (desired, chair, user RequestStatus) {
	return s.Desired, s.Chair, s.User
}
