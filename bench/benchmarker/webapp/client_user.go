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

func (c *Client) Register(ctx context.Context, reqBody *api.RegisterUserReq) (*api.RegisterUserOK, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/app/register", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /app/register のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("POST /app/register へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.RegisterUserOK{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("registerのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) PostRequest(ctx context.Context, reqBody *api.PostRequestReq) (*api.PostRequestAccepted, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/app/requests", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /app/requests のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("POST /app/requests へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusAccepted, resp.StatusCode)
	}

	resBody := &api.PostRequestAccepted{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) GetRequest(ctx context.Context, requestID string) (*api.GetAppRequestOK, error) {
	req, err := c.agent.NewRequest(http.MethodGet, fmt.Sprintf("/app/requests/%s", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("GET /app/requests/{request_id} のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET /app/requests/{request_id} へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.GetAppRequestOK{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) PostEvaluate(ctx context.Context, requestID string, reqBody *api.EvaluateReq) (*api.EvaluateNoContent, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, fmt.Sprintf("/app/requests/%s/evaluate", requestID), bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /app/requests/{request_id}/evaluate のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /app/requests/{request_id}/evaluate へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.EvaluateNoContent{}
	return resBody, nil
}
