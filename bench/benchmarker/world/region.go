package world

import (
	"math"
	"sync/atomic"

	"github.com/isucon/isucon14/bench/internal/concurrent"
)

type Region struct {
	RegionOffsetX int
	RegionOffsetY int
	RegionWidth   int
	RegionHeight  int
	// UsersDB 地域内のユーザー
	UsersDB *concurrent.SimpleMap[UserID, *User]
	// TotalEvaluation 地域内のユーザーのリクエストの平均評価の合計値
	TotalEvaluation atomic.Int32
}

func NewRegion(offsetX, offsetY, width, height int) *Region {
	return &Region{
		RegionOffsetX: offsetX,
		RegionOffsetY: offsetY,
		RegionWidth:   width,
		RegionHeight:  height,
		UsersDB:       concurrent.NewSimpleMap[UserID, *User](),
	}
}

// Contains Regionが座標cを含んでいるかどうか
func (r *Region) Contains(c Coordinate) bool {
	left, right := r.RangeX()
	if !(left <= c.X && c.X <= right) {
		return false
	}
	bottom, top := r.RangeY()
	return bottom <= c.Y && c.Y <= top
}

// RangeX RegionのX座標の範囲
func (r *Region) RangeX() (left, right int) {
	halfWidth := r.RegionWidth / 2
	return r.RegionOffsetX - halfWidth, r.RegionOffsetX + halfWidth
}

// RangeY RegionのY座標の範囲
func (r *Region) RangeY() (bottom, top int) {
	halfHeight := r.RegionHeight / 2
	return r.RegionOffsetY - halfHeight, r.RegionOffsetY + halfHeight
}

// UserSatisfactionScore 地域内のユーザーの満足度
func (r *Region) UserSatisfactionScore() int {
	// TODO: 検討
	// 地域内の全ユーザーの平均評価の平均値を地域のユーザー満足度にしている
	// (ユーザーの評価の初期値は0)
	return int(math.Round(float64(r.TotalEvaluation.Load()) / float64(r.UsersDB.Len())))
}
