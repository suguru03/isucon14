package webapp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"iter"
	"net/http"
	"strings"
	"time"

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

func (c *Client) AppGetRequest(ctx context.Context, requestID string) (*api.AppRequest, error) {
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

	resBody := &api.AppRequest{}
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

func (c *Client) AppGetNotification(ctx context.Context) (iter.Seq[*api.AppRequest], func() error, error) {
	req, err := c.agent.NewRequest(http.MethodGet, "/app/notification", nil)
	if err != nil {
		return nil, nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	httpClient := &http.Client{
		Transport: c.agent.HttpClient.Transport,
		Timeout:   60 * time.Second,
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		c.contestantLogger.Warn("GET /app/notifications のリクエストが失敗しました", zap.Error(err))
		return nil, nil, err
	}

	resultErr := new(error)
	if strings.Contains(resp.Header.Get("Content-Type"), "text/event-stream") {
		scanner := bufio.NewScanner(resp.Body)
		return func(yield func(ok *api.AppRequest) bool) {
				defer resp.Body.Close()
				for scanner.Scan() {
					request := &api.AppRequest{}
					line := scanner.Text()
					if strings.HasPrefix(line, "data:") {

						if err := json.Unmarshal([]byte(line[5:]), request); err != nil {
							resultErr = &err
							return
						}

						if !yield(request) {
							return
						}
					}
				}
			}, func() error {
				return *resultErr
			}, nil
	}

	request := &api.AppRequest{}
	if resp.StatusCode == http.StatusOK {
		decoder := json.NewDecoder(resp.Body)
		if err := decoder.Decode(request); err != nil {
			return nil, nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
		}
	} else if resp.StatusCode != http.StatusNoContent {
		resp.Body.Close()
		return nil, nil, fmt.Errorf("GET /app/notifications へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d or %d, actual:%d)", http.StatusOK, http.StatusNoContent, resp.StatusCode)
	}
	resp.Body.Close()
	return func(yield func(ok *api.AppRequest) bool) {
			if !yield(request) || ctx.Value("nested") != nil {
				return
			}

			for {
				// TODO: tickを拾ってくる
				time.Sleep(90 * time.Millisecond)
				notifications, result, err := c.AppGetNotification(context.WithValue(ctx, "nested", true))
				if err != nil {
					resultErr = &err
					return
				}

				for notification := range notifications {
					if !yield(notification) {
						return
					}
				}
				if err := result(); err != nil {
					resultErr = &err
					return
				}
			}
		}, func() error {
			return *resultErr
		}, nil
}

func (c *Client) AppPostPaymentMethods(ctx context.Context, reqBody *api.AppPostPaymentMethodsReq) (*api.AppPostPaymentMethodsNoContent, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/app/payment-methods", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /app/payment-methods のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /app/payment-methods へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.AppPostPaymentMethodsNoContent{}
	return resBody, nil
}
