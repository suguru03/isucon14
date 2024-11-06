package webapp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"iter"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
)

func (c *Client) AppPostRegister(ctx context.Context, reqBody *api.AppPostRegisterReq) (*api.AppPostRegisterCreated, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/api/app/register", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /api/app/registerのリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("POST /api/app/registerへのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.AppPostRegisterCreated{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("registerのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) AppGetRequests(ctx context.Context) (*api.AppGetRequestsOK, error) {
	req, err := c.agent.NewRequest(http.MethodGet, "/api/app/requests", nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("GET /app/requests のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET /app/requests へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.AppGetRequestsOK{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestsのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) AppPostRequest(ctx context.Context, reqBody *api.AppPostRequestReq) (*api.AppPostRequestAccepted, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/api/app/requests", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /api/app/requestsのリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("POST /api/app/requestsへのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusAccepted, resp.StatusCode)
	}

	resBody := &api.AppPostRequestAccepted{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) AppGetRequest(ctx context.Context, requestID string) (*api.AppRequest, error) {
	req, err := c.agent.NewRequest(http.MethodGet, fmt.Sprintf("/api/app/requests/%s", requestID), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("GET /api/app/requests/{request_id}のリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET /api/app/requests/{request_id}へのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.AppRequest{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) AppPostRequestEvaluate(ctx context.Context, requestID string, reqBody *api.AppPostRequestEvaluateReq) (*api.AppPostRequestEvaluateOK, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, fmt.Sprintf("/api/app/requests/%s/evaluate", requestID), bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /api/app/requests/{request_id}/evaluateのリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("POST /api/app/requests/{request_id}/evaluateへのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.AppPostRequestEvaluateOK{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}

func (c *Client) AppPostPaymentMethods(ctx context.Context, reqBody *api.AppPostPaymentMethodsReq) (*api.AppPostPaymentMethodsNoContent, error) {
	reqBodyBuf, err := reqBody.MarshalJSON()
	if err != nil {
		return nil, err
	}

	req, err := c.agent.NewRequest(http.MethodPost, "/api/app/payment-methods", bytes.NewReader(reqBodyBuf))
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("POST /api/app/payment-methodsのリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("POST /api/app/payment-methodsへのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusNoContent, resp.StatusCode)
	}

	resBody := &api.AppPostPaymentMethodsNoContent{}
	return resBody, nil
}

func (c *Client) AppGetNotification(ctx context.Context) iter.Seq2[*api.AppRequest, error] {
	return func(yield func(*api.AppRequest, error) bool) {
		for notification, err := range c.appGetNotification(ctx, false) {
			if notification == nil {
				if !yield(nil, err) {
					return
				}
			} else {
				if !yield(&api.AppRequest{
					RequestID:             notification.RequestID,
					PickupCoordinate:      notification.PickupCoordinate,
					DestinationCoordinate: notification.DestinationCoordinate,
					Status:                notification.Status,
					Chair:                 notification.Chair,
					CreatedAt:             notification.CreatedAt,
					UpdatedAt:             notification.UpdatedAt,
				}, err) {
					return
				}
			}
		}
	}
}

func (c *Client) appGetNotification(ctx context.Context, nested bool) iter.Seq2[*api.AppGetNotificationOK, error] {
	req, err := c.agent.NewRequest(http.MethodGet, "/api/app/notification", nil)
	if err != nil {
		return func(yield func(*api.AppGetNotificationOK, error) bool) { yield(nil, err) }
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	httpClient := &http.Client{
		Transport:     c.agent.HttpClient.Transport,
		CheckRedirect: c.agent.HttpClient.CheckRedirect,
		Jar:           c.agent.HttpClient.Jar,
		Timeout:       60 * time.Second,
	}

	resp, err := httpClient.Do(req.WithContext(ctx))
	if err != nil {
		return func(yield func(*api.AppGetNotificationOK, error) bool) {
			yield(nil, fmt.Errorf("GET /api/app/notificationsのリクエストが失敗しました: %w", err))
		}
	}

	if strings.Contains(resp.Header.Get("Content-Type"), "text/event-stream") {
		return func(yield func(*api.AppGetNotificationOK, error) bool) {
			defer closeBody(resp)

			scanner := bufio.NewScanner(resp.Body)
			for scanner.Scan() {
				request := &api.AppGetNotificationOK{}
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
	request := &api.AppGetNotificationOK{}
	if resp.StatusCode == http.StatusOK {
		if err = json.NewDecoder(resp.Body).Decode(request); err != nil {
			err = fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
		}
	} else if resp.StatusCode != http.StatusNoContent {
		err = fmt.Errorf("GET /api/app/notificationsへのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d or %d, actual:%d)", http.StatusOK, http.StatusNoContent, resp.StatusCode)
	}

	if nested {
		return func(yield func(*api.AppGetNotificationOK, error) bool) { yield(request, err) }
	} else {
		return func(yield func(*api.AppGetNotificationOK, error) bool) {
			if !yield(request, err) {
				return
			}

			const defaultWaitTime = 30 * time.Millisecond
			waitTime := defaultWaitTime
			for {
				select {
				// こちらから切断
				case <-ctx.Done():
					return

				default:
					time.Sleep(waitTime)
					for notification, err := range c.appGetNotification(ctx, true) {
						if !yield(notification, err) {
							return
						}
						if notification != nil && notification.RetryAfterMs.IsSet() {
							waitTime = time.Duration(notification.RetryAfterMs.Value) * time.Millisecond
						} else {
							waitTime = defaultWaitTime
						}
					}
				}
			}
		}
	}
}

func (c *Client) AppGetNearbyChairs(ctx context.Context, params *api.AppGetNearbyChairsParams) (*api.AppGetNearbyChairsOK, error) {
	queryParams := url.Values{}
	queryParams.Set("latitude", strconv.Itoa(params.Latitude))
	queryParams.Set("longitude", strconv.Itoa(params.Longitude))
	if params.Distance.Set {
		queryParams.Set("distance", strconv.Itoa(params.Distance.Value))
	}

	req, err := c.agent.NewRequest(http.MethodGet, "/api/app/nearby-chairs?"+queryParams.Encode(), nil)
	if err != nil {
		return nil, err
	}

	for _, modifier := range c.requestModifiers {
		modifier(req)
	}

	resp, err := c.agent.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("GET /api/app/requests/nearby-chairsのリクエストが失敗しました: %w", err)
	}
	defer closeBody(resp)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET /api/app/requests/nearby-chairsへのリクエストに対して、期待されたHTTPステータスコードが確認できませんでした (expected:%d, actual:%d)", http.StatusOK, resp.StatusCode)
	}

	resBody := &api.AppGetNearbyChairsOK{}
	if err := json.NewDecoder(resp.Body).Decode(resBody); err != nil {
		return nil, fmt.Errorf("requestのJSONのdecodeに失敗しました: %w", err)
	}

	return resBody, nil
}
