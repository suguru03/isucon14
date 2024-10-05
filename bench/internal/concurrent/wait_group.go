package concurrent

import (
	"sync"
)

// WaitChan wg.Waitが完了するまでブロックするチャネルを作成する
func WaitChan(wg *sync.WaitGroup) <-chan struct{} {
	c := make(chan struct{})
	go func() {
		defer close(c)
		wg.Wait()
	}()
	return c
}
