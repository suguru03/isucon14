package webapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"go.uber.org/zap"

	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
)

func (c *Client) ProviderPostRegister(ctx context.Context, reqBody *api.ProviderPostRegisterReq) (*api.ProviderPostRegisterCreated, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/provider/register", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /provider/register のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("POST /provider/register へのリクエストに対して、期待されたHTTPステータスコードが確認できませませんでした (expected:%d, actual:%d)", http.StatusCreated, resp.StatusCode)
	}

	resBody := &api.ProviderPostRegisterCreated{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("registerのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) ProviderGetSales(ctx context.Context) (*api.ProviderGetSalesOK, error) {
	req, err := c.agent.NewRequest(http.MethodGet, "/provider/sales", nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("GET /provider/sales のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET /provider/sales へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.ProviderGetSalesOK{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}
