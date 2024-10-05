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

func (c *Client) RegisterDriver(ctx context.Context, reqBody *api.RegisterDriverReq) (*api.RegisterDriverCreated, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/driver/register", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /driver/register のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("POST /driver/register へのリクエストに対して、期待されたHTTPステータスコードが確認できませませんでした (expected:%d, actual:%d)", http.StatusCreated, resp.StatusCode)
	}

	resBody := &api.RegisterDriverCreated{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("registerのJSONのdecodeに失敗しました: %w", err)
	}

	c.AddRequestModifier(func(req *http.Request) {
		req.Header.Set("Authorization", "Bearer "+resBody.AccessToken)
	})

	return resBody, nil
}

func (c *Client) PostActivate(ctx context.Context) (*api.ActivateDriverNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, "/driver/activate", nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /driver/activate のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /driver/activate へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.ActivateDriverNoContent{}
	return resBody, nil
}

func (c *Client) PostDeactivate(ctx context.Context) (*api.DeactivateDriverNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, "/driver/deactivate", nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /driver/deactivate のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /driver/deactivate へのリクエストに対して、期待されたHTTPステータスコードが確認できませませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.DeactivateDriverNoContent{}
	return resBody, nil
}

func (c *Client) PostCoordinate(ctx context.Context, reqBody *api.Coordinate) (*api.PostDriverCoordinateNoContent, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/driver/coordinate", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /driver/coordinate のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /driver/coordinate へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.PostDriverCoordinateNoContent{}
	return resBody, nil
}

func (c *Client) GetDriverRequest(ctx context.Context, requestID string) (*api.GetRequestOK, error) {
	req, err := c.agent.NewRequest(http.MethodGet, fmt.Sprintf("/driver/requests/%s", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("GET /driver/requests/{requestID} のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET /driver/requests/{requestID} へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.GetRequestOK{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) PostAccept(ctx context.Context, requestID string) (*api.AcceptRequestNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, fmt.Sprintf("/driver/requests/%s/accept", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /driver/requests/{requestID}/accept のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /driver/requests/{requestID}/accept へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.AcceptRequestNoContent{}
	return resBody, nil
}

func (c *Client) PostDeny(ctx context.Context, requestID string) (*api.DenyRequestNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, fmt.Sprintf("/driver/requests/%s/deny", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /driver/requests/{requestID}/deny のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /driver/requests/{requestID}/deny へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.DenyRequestNoContent{}
	return resBody, nil
}

func (c *Client) PostDepart(ctx context.Context, requestID string) (*api.DepartNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, fmt.Sprintf("/driver/requests/%s/depart", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		c.contestantLogger.Warn("POST /driver/requests/{requestID}/depart のリクエストが失敗しました", zap.Error(err))
		return nil, err
	}

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /driver/requests/{requestID}/depart へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.DepartNoContent{}
	return resBody, nil
}

func (c *Client) ReceiveNotifications(ctx context.Context) (iter.Seq[*api.GetRequestOK], func() error, error) {
	req, err := c.agent.NewRequest(http.MethodGet, "/driver/notification", nil)
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
		c.contestantLogger.Warn("GET /driver/notifications のリクエストが失敗しました", zap.Error(err))
		return nil, nil, err
	}

	scanner := bufio.NewScanner(resp.Body)
	resultErr := new(error)
	return func(yield func(ok *api.GetRequestOK) bool) {
			defer resp.Body.Close()
			for scanner.Scan() {
				request := &api.GetRequestOK{}
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
