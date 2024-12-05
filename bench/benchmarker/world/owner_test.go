package world

import "testing"

func TestDesiredChairNum(t *testing.T) {
	n := 0
	for i := 0; i < 1000; i++ {
		num := desiredChairNum(i * 1000)
		if num > n {
			n = num
			t.Logf("num: %d, sales: %d", num, i*1000)
		}
	}
}
