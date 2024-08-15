package webapp

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"

	"go.uber.org/zap"
)

func (c *Client) GetPing(ctx context.Context) error {
	req, err := c.agent.NewRequest(http.MethodGet, "/api/ping", nil)
	if err != nil {
		return err
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("GET /api/ping のリクエストが失敗しました", zap.Error(err))
		return fmt.Errorf("GET /api/ping のリクエストが失敗しました: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET /api/ping へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}
	defer func() {
		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
	}()

	if body, _ := io.ReadAll(resp.Body); !bytes.Equal(body, []byte("pong")) {
		return fmt.Errorf("GET /api/pingのレスポンスが誤っています: %s", body)
	}

	return nil
}
