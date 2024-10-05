package world

import (
	"fmt"
	"math/rand/v2"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChair_moveRandom(t *testing.T) {
	c := Chair{
		Current: C(0, 0),
		Speed:   13,
		Rand:    rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64())),
	}
	for range 1000 {
		prev := c.Current
		c.moveRandom()
		assert.Equal(t, c.Speed, prev.DistanceTo(c.Current), "ランダムに動く量は常にSpeedと一致しなければならない")
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

func TestChair_isRequestAcceptable(t *testing.T) {
	const speed = 10
	workTime8to16 := NewInterval(ConvertHour(8), ConvertHour(16))

	tests := []struct {
		name      string
		chair     *Chair
		req       *Request
		timeOfDay int
		expected  bool
	}{
		{
			name: "稼働中でない",
			chair: &Chair{
				State: ChairStateInactive,
			},
			expected: false,
		},
		{
			name: "稼働中で勤務時間内に完了できる",
			chair: &Chair{
				State:    ChairStateActive,
				Current:  C(0, 0),
				Speed:    speed,
				WorkTime: workTime8to16,
			},
			timeOfDay: ConvertHour(10),
			req: &Request{
				PickupPoint:      C(speed*10, 0),
				DestinationPoint: C(speed*10, speed*ConvertHour(1)),
			},
			expected: true,
		},
		{
			name: "稼働中で勤務時間内に完了できない",
			chair: &Chair{
				State:    ChairStateActive,
				Current:  C(0, 0),
				Speed:    speed,
				WorkTime: workTime8to16,
			},
			timeOfDay: ConvertHour(10),
			req: &Request{
				PickupPoint:      C(speed*10, 0),
				DestinationPoint: C(speed*10, speed*ConvertHour(8)),
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.chair.isRequestAcceptable(tt.req, tt.timeOfDay))
		})
	}
}
