package main

import (
	"errors"
	"net/http"

	"github.com/oklog/ulid/v2"
)

type postProviderRegisterRequest struct {
	Name string `json:"name"`
}

type postProviderRegisterResponse struct {
	AccessToken string `json:"access_token"`
	ID          string `json:"id"`
}

func providerPostRegister(w http.ResponseWriter, r *http.Request) {
	req := &postProviderRegisterRequest{}
	if err := bindJSON(r, req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	providerID := ulid.Make().String()

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, errors.New("some of required fields(name) are empty"))
		return
	}

	accessToken := secureRandomStr(32)
	_, err := db.Exec(
		"INSERT INTO providers (id, name, access_token, created_at, updated_at) VALUES (?, ?, ?, isu_now(), isu_now())",
		providerID, req.Name, accessToken,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusCreated, &postProviderRegisterResponse{
		AccessToken: accessToken,
		ID:          providerID,
	})
}

type getProviderSalesResponse struct {
	TotalSales int          `json:"total_sales"`
	Chairs     []ChairSales `json:"chairs"`
	Models     []ModelSales `json:"models"`
}

type ChairSales struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Sales int    `json:"sales"`
}

type ModelSales struct {
	Model string `json:"model"`
	Sales int    `json:"sales"`
}

// TODO: ちゃんと実装する
func providerGetSales(w http.ResponseWriter, r *http.Request) {
	provider := r.Context().Value("provider").(*Provider)

	chairs := []Chair{}
	if err := db.Select(&chairs, "SELECT * FROM chairs WHERE provider_id = ?", provider.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	res := getProviderSalesResponse{
		TotalSales: 0,
	}

	modelSalesByModel := map[string]int{}

	for _, chair := range chairs {
		reqs := []RideRequest{}
		// TODO: Since, Untilの実装
		if err := db.Select(&reqs, "SELECT * FROM ride_requests WHERE chair_id = ? AND status = 'COMPLETED'", chair.ID); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		chairSales := sumSales(reqs)
		res.TotalSales += chairSales

		res.Chairs = append(res.Chairs, ChairSales{
			ID:    chair.ID,
			Name:  chair.Name,
			Sales: chairSales,
		})

		modelSalesByModel[chair.Model] += chairSales
	}

	modelSales := []ModelSales{}
	for model, sales := range modelSalesByModel {
		modelSales = append(modelSales, ModelSales{
			Model: model,
			Sales: sales,
		})
	}

	res.Models = modelSales

	writeJSON(w, http.StatusOK, res)
}

const (
	initialFare     = 500
	farePerDistance = 100
)

func sumSales(requests []RideRequest) int {
	sale := 0
	for _, req := range requests {
		sale += calculateSale(req)
	}
	return sale
}

func calculateSale(req RideRequest) int {
	latDiff := max(req.DestinationLatitude-req.PickupLatitude, req.PickupLatitude-req.DestinationLatitude)
	lonDiff := max(req.DestinationLongitude-req.PickupLongitude, req.PickupLongitude-req.DestinationLongitude)
	return initialFare + farePerDistance*(latDiff+lonDiff)
}
