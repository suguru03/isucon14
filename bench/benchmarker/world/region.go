package world

type Region struct {
	RegionOffsetX int
	RegionOffsetY int
	RegionWidth   int
	RegionHeight  int
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
	return r.RegionOffsetX - halfWidth, r.RegionOffsetY + halfWidth
}

// RangeY RegionのY座標の範囲
func (r *Region) RangeY() (bottom, top int) {
	halfHeight := r.RegionHeight / 2
	return r.RegionOffsetY - halfHeight, r.RegionOffsetY + halfHeight
}
