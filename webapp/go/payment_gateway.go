package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

var paymentURL = "http://localhost:12345"

var erroredUpstream = errors.New("errored upstream")

type paymentGatewayPostPaymentRequest struct {
	Amount int    `json:"amount"`
}

func requestPaymentGatewayPostPayment(token string, param *paymentGatewayPostPaymentRequest) error {
	b, err := json.Marshal(param)
	if err != nil {
		return err
	}

	// 失敗したらとりあえずリトライ
	// FIXME: 社内決済マイクロサービスのインフラに異常が発生していて、同時にたくさんリクエストすると変なことになる可能性あり
	retry := 0
	for {
		err := func() error {
			req, err := http.NewRequest(http.MethodPost, paymentURL+"/payments", bytes.NewBuffer(b))
			if err != nil {
				return err
			}
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+token)

			res, err := http.DefaultClient.Do(req)
			if err != nil {
				return err
			}
			defer res.Body.Close()

			if res.StatusCode != http.StatusNoContent {
				return fmt.Errorf("unexpected status code (%d): %w", res.StatusCode, erroredUpstream)
			}
			return nil
		}()
		if err != nil {
			if retry < 5 {
				retry++
				time.Sleep(100 * time.Millisecond)
				continue
			} else {
				return err
			}
		}
		break
	}

	return nil
}
