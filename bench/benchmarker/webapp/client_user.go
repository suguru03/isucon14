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

func (c *Client) AppPostRegister(ctx context.Context, reqBody *api.AppPostRegisterReq) (*api.AppPostRegisterOK, error) {
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

	resBody := &api.AppPostRegisterOK{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("registerのJSONのdecodeに失敗しました: %w", err)
	}

	c.AddRequestModifier(func(req *http.Request) {
		req.Header.Set("Authorization", "Bearer "+resBody.AccessToken)
	})

	return resBody, nil
}

func (c *Client) AppPostRequest(ctx context.Context, reqBody *api.AppPostRequestReq) (*api.AppPostRequestAccepted, error) {
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

	resBody := &api.AppPostRequestAccepted{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) AppGetRequest(ctx context.Context, requestID string) (*api.AppGetRequestOK, error) {
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

	resBody := &api.AppGetRequestOK{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) AppPostRequestEvaluate(ctx context.Context, requestID string, reqBody *api.AppPostRequestEvaluateReq) (*api.AppPostRequestEvaluateNoContent, error) {
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

	resBody := &api.AppPostRequestEvaluateNoContent{}
	return resBody, nil
}
