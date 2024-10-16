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

	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
)

func (c *Client) ChairPostRegister(ctx context.Context, reqBody *api.ChairPostRegisterReq) (*api.ChairPostRegisterCreated, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/chair/register", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /chair/register のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("POST /chair/register へのリクエストに対して、期待されたHTTPステータスコードが確認できませませんでした (expected:%d, actual:%d)", http.StatusCreated, resp.StatusCode)
	}

	resBody := &api.ChairPostRegisterCreated{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("registerのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) ChairPostActivate(ctx context.Context) (*api.ChairPostActivateNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, "/chair/activate", nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /chair/activate のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /chair/activate へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.ChairPostActivateNoContent{}
	return resBody, nil
}

func (c *Client) ChairPostDeactivate(ctx context.Context) (*api.ChairPostDeactivateNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, "/chair/deactivate", nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /chair/deactivate のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /chair/deactivate へのリクエストに対して、期待されたHTTPステータスコードが確認できませませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.ChairPostDeactivateNoContent{}
	return resBody, nil
}

func (c *Client) ChairPostCoordinate(ctx context.Context, reqBody *api.Coordinate) (*api.ChairPostCoordinateNoContent, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/chair/coordinate", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /chair/coordinate のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /chair/coordinate へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.ChairPostCoordinateNoContent{}
	return resBody, nil
}

func (c *Client) ChairGetRequest(ctx context.Context, requestID string) (*api.ChairRequest, error) {
	req, err := c.agent.NewRequest(http.MethodGet, fmt.Sprintf("/chair/requests/%s", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("GET /chair/requests/{requestID} のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET /chair/requests/{requestID} へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.ChairRequest{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) ChairPostRequestAccept(ctx context.Context, requestID string) (*api.ChairPostRequestAcceptNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, fmt.Sprintf("/chair/requests/%s/accept", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /chair/requests/{requestID}/accept のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /chair/requests/{requestID}/accept へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.ChairPostRequestAcceptNoContent{}
	return resBody, nil
}

func (c *Client) ChairPostRequestDeny(ctx context.Context, requestID string) (*api.ChairPostRequestDenyNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, fmt.Sprintf("/chair/requests/%s/deny", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /chair/requests/{requestID}/deny のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /chair/requests/{requestID}/deny へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.ChairPostRequestDenyNoContent{}
	return resBody, nil
}

func (c *Client) ChairPostRequestDepart(ctx context.Context, requestID string) (*api.ChairPostRequestDepartNoContent, error) {
	req, err := c.agent.NewRequest(http.MethodPost, fmt.Sprintf("/chair/requests/%s/depart", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /chair/requests/{requestID}/depart のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /chair/requests/{requestID}/depart へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.ChairPostRequestDepartNoContent{}
	return resBody, nil
}

func (c *Client) ChairGetNotification(ctx context.Context) iter.Seq2[*api.ChairRequest, error] {
	return c.chairGetNotification(ctx, false)
}

func (c *Client) chairGetNotification(ctx context.Context, nested bool) iter.Seq2[*api.ChairRequest, error] {
	req, err := c.agent.NewRequest(http.MethodGet, "/chair/notification", nil)
	if err != nil {
		return func(yield func(*api.ChairRequest, error) bool) { yield(nil, err) }
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	httpClient := &http.Client{
		Transport: c.agent.HttpClient.Transport,
		Timeout:   60 * time.Second,
	}

	resp, err := httpClient.Do(req.WithContext(ctx))
	if err != nil {
		return func(yield func(*api.ChairRequest, error) bool) {
			yield(nil, fmt.Errorf("GET /chair/notifications のリクエストが失敗しました: %w", err))
		}
	}

	if strings.Contains(resp.Header.Get("Content-Type"), "text/event-stream") {
		return func(yield func(*api.ChairRequest, error) bool) {
			defer closeBody(resp)

			scanner := bufio.NewScanner(resp.Body)
			for scanner.Scan() {
				request := &api.ChairRequest{}
				line := scanner.Text()
				if strings.HasPrefix(line, "data:") {
					err := json.Unmarshal([]byte(line[5:]), request)
					if !yield(request, err) || err != nil {
						return
					}
				}
			}
		}
	}

	defer closeBody(resp)
	request := &api.ChairRequest{}
	if resp.StatusCode == http.StatusOK {
		if err = json.NewDecoder(resp.Body).Decode(request); err != nil {
			err = fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
		}
	} else if resp.StatusCode != http.StatusNoContent {
		err = fmt.Errorf("GET /chair/notifications へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d or %d, actual:%d)", http.StatusOK, http.StatusNoContent, resp.StatusCode)
	}

	if nested {
		return func(yield func(*api.ChairRequest, error) bool) { yield(request, err) }
	} else {
		return func(yield func(*api.ChairRequest, error) bool) {
			if !yield(request, err) {
				return
			}

			for {
				select {
				// こちらから切断
				case <-ctx.Done():
					return

				default:
					// TODO: tickを拾ってくる
					time.Sleep(30 * time.Millisecond)
					for notification, err := range c.chairGetNotification(ctx, true) {
						if !yield(notification, err) {
							return
						}
					}
				}
			}
		}
	}
}
