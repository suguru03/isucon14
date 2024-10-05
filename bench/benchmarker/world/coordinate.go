package world

import (
	"fmt"
	"math/rand/v2"
)

// Coordinate 座標
type Coordinate struct {
	X int
	Y int
}

func C(x, y int) Coordinate {
	return Coordinate{X: x, Y: y}
}

func (c Coordinate) String() string {
	return fmt.Sprintf("(%d,%d)", c.X, c.Y)
}

func (c Coordinate) Equals(c2 Coordinate) bool {
	return c.X == c2.X && c.Y == c2.Y
}

// DistanceTo c2までのマンハッタン距離
func (c Coordinate) DistanceTo(c2 Coordinate) int {
	return abs(c.X-c2.X) + abs(c.Y-c2.Y)
}

// Within 座標がregion内にあるかどうか
func (c Coordinate) Within(region *Region) bool {
	return region.Contains(c)
}

func RandomCoordinate(worldX, worldY int) Coordinate {
	return C(rand.IntN(worldX), rand.IntN(worldY))
}

func RandomCoordinateWithRand(worldX, worldY int, rand *rand.Rand) Coordinate {
	return C(rand.IntN(worldX), rand.IntN(worldY))
}

func RandomCoordinateOnRegion(region *Region) Coordinate {
	return C(region.RegionOffsetX+rand.IntN(region.RegionWidth)-region.RegionWidth/2, region.RegionOffsetY+rand.IntN(region.RegionHeight)-region.RegionHeight/2)
}

func RandomCoordinateOnRegionWithRand(region *Region, rand *rand.Rand) Coordinate {
	return C(region.RegionOffsetX+rand.IntN(region.RegionWidth)-region.RegionWidth/2, region.RegionOffsetY+rand.IntN(region.RegionHeight)-region.RegionHeight/2)
}

func RandomCoordinateAwayFromHereWithRand(here Coordinate, distance int, rand *rand.Rand) Coordinate {
	// 移動量の決定
	x := rand.IntN(distance + 1)
	y := distance - x

	// 移動方向の決定
	switch rand.IntN(4) {
	case 0:
		x *= -1
	case 1:
		y *= -1
	case 2:
		x *= -1
		y *= -1
	case 3:
		break
	}
	return C(here.X+x, here.Y+y)
}
