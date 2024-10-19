package world

import (
	"fmt"
	"math/rand/v2"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChair_moveRandom(t *testing.T) {
	region := &Region{
		RegionOffsetX: 0,
		RegionOffsetY: 0,
		RegionWidth:   100,
		RegionHeight:  100,
	}
	c := Chair{
		Region:  region,
		Current: C(0, 0),
		Speed:   13,
		Rand:    rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64())),
	}
	for range 1000 {
		prev := c.Current
		c.moveRandom()
		assert.Equal(t, c.Speed, prev.DistanceTo(c.Current), "ランダムに動く量は常にSpeedと一致しなければならない")
		assert.True(t, c.Current.Within(region), "ランダムに動く範囲はリージョン内に収まっている")
	}
}

func TestChair_moveToward(t *testing.T) {
	tests := []struct {
		chair *Chair
		dest  Coordinate
	}{
		{
			chair: &Chair{
				Current: C(30, 30),
				Speed:   13,
			},
			dest: C(30, 30),
		},
		{
			chair: &Chair{
				Current: C(0, 0),
				Speed:   13,
			},
			dest: C(30, 30),
		},
		{
			chair: &Chair{
				Current: C(0, 0),
				Speed:   13,
			},
			dest: C(-30, 30),
		},
		{
			chair: &Chair{
				Current: C(0, 0),
				Speed:   13,
			},
			dest: C(30, -30),
		},
		{
			chair: &Chair{
				Current: C(0, 0),
				Speed:   13,
			},
			dest: C(-30, -30),
		},
		{
			chair: &Chair{
				Current: C(0, 0),
				Speed:   10,
			},
			dest: C(30, 30),
		},
		{
			chair: &Chair{
				Current: C(0, 0),
				Speed:   10,
			},
			dest: C(-30, 30),
		},
		{
			chair: &Chair{
				Current: C(0, 0),
				Speed:   10,
			},
			dest: C(30, -30),
		},
		{
			chair: &Chair{
				Current: C(0, 0),
				Speed:   10,
			},
			dest: C(-30, -30),
		},
	}
	for _, tt := range tests {
		tt.chair.Rand = rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64()))
		t.Run(fmt.Sprintf("%s->%s,speed:%d", tt.chair.Current, tt.dest, tt.chair.Speed), func(t *testing.T) {
			initialCurrent := tt.chair.Current

			// 初期位置から目的地までの距離
			distance := tt.chair.Current.DistanceTo(tt.dest)
			// 到着までにかかるループ数
			expectedTick := neededTime(distance, tt.chair.Speed)

			t.Logf("distance: %d, expected ticks: %d", distance, expectedTick)

			for range 100 {
				tt.chair.Current = initialCurrent
				for range expectedTick {
					// t.Logf("Current: %s", tt.chair.Current)
					require.NotEqual(t, tt.dest, tt.chair.Current, "必要なループ数より前に到着している")

					prev := tt.chair.Current
					tt.chair.moveToward(tt.dest)
					if !tt.dest.Equals(tt.chair.Current) {
						require.Equal(t, tt.chair.Speed, prev.DistanceTo(tt.chair.Current), "目的地に到着するまでの１ループあたりの移動量は常にSpeedと一致しないといけない")
					}
				}
				require.Equal(t, tt.dest, tt.chair.Current, "想定しているループ数で到着できていない")
			}
		})
	}
}
