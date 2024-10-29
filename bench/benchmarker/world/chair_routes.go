package world

import (
	"sync"
	"time"

	"github.com/guregu/null/v5"
)

type ChairLocation struct {
	// Initial 初期位置
	Initial Coordinate

	current             *LocationEntry
	history             []*LocationEntry
	totalTravelDistance int
	dirty               bool

	mu sync.RWMutex
}

type LocationEntry struct {
	Coord      Coordinate
	Time       int64
	ServerTime null.Time
}

func (r *ChairLocation) Current() Coordinate {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.current == nil {
		return r.Initial
	}
	return r.current.Coord
}

func (r *ChairLocation) TotalTravelDistance() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.totalTravelDistance
}

func (r *ChairLocation) TotalTravelDistanceUntil(until time.Time) int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	sum := 0
	prev := r.Initial
	for _, entry := range r.history {
		if entry.ServerTime.Valid {
			if entry.ServerTime.Time.After(until) {
				break
			} else {
				sum += prev.DistanceTo(entry.Coord)
				prev = entry.Coord
			}
		}
	}
	return sum
}

func (r *ChairLocation) ResetDirtyFlag() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.dirty = false
}

func (r *ChairLocation) Dirty() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.dirty
}

// PlaceTo 椅子をlocationに配置する。前回の位置との距離差を総移動距離には加算しない
func (r *ChairLocation) PlaceTo(location *LocationEntry) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.history = append(r.history, location)
	r.current = location
	r.dirty = true
}

// MoveTo 椅子をlocationに移動させ、総移動距離を加算する
func (r *ChairLocation) MoveTo(location *LocationEntry) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.history = append(r.history, location)
	r.totalTravelDistance += r.current.Coord.DistanceTo(location.Coord)
	r.current = location
	r.dirty = true
}

func (r *ChairLocation) SetServerTime(serverTime time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.current.ServerTime = null.TimeFrom(serverTime)
}
