package world

type Region struct {
	RegionOffsetX int
	RegionOffsetY int
	RegionWidth   int
	RegionHeight  int
}

// Contains Regionが座標cを含んでいるかどうか
func (r *Region) Contains(c Coordinate) bool {
	halfWidth := r.RegionWidth / 2
	halfHeight := r.RegionHeight / 2
	return r.RegionOffsetX-halfWidth <= c.X && c.X <= r.RegionOffsetX+halfWidth &&
		r.RegionOffsetY-halfHeight <= c.Y && c.Y <= r.RegionOffsetY+halfHeight
}
