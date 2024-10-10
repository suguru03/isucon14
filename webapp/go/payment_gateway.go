package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
)

var paymentURL = "http://localhost:12345"

var erroredUpstream = errors.New("errored upstream")

type paymentGatewayPostPaymentRequest struct {
	Token  string `json:"token"`
	Amount int    `json:"amount"`
}

func requestPaymentGatewayPostPayment(param *paymentGatewayPostPaymentRequest) error {
	b, err := json.Marshal(param)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, paymentURL+"/payment", bytes.NewBuffer(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	fmt.Printf("&+v", res)

	if res.StatusCode != http.StatusNoContent {
		return fmt.Errorf("unexpected status code (%d): %w", res.StatusCode, erroredUpstream)
	}

	return nil
}
