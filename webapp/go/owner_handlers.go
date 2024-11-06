package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/oklog/ulid/v2"
)

const (
	initialFare     = 500
	farePerDistance = 100
)

type ownerPostRegisterRequest struct {
	Name string `json:"name"`
}

type ownerPostRegisterResponse struct {
	ID                 string `json:"id"`
	ChairRegisterToken string `json:"chair_register_token"`
}

func ownerPostRegister(w http.ResponseWriter, r *http.Request) {
	req := &ownerPostRegisterRequest{}
	if err := bindJSON(r, req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, errors.New("some of required fields(name) are empty"))
		return
	}

	ownerID := ulid.Make().String()
	accessToken := secureRandomStr(32)
	chairRegisterToken := secureRandomStr(32)

	_, err := db.Exec(
		"INSERT INTO owners (id, name, access_token, chair_register_token) VALUES (?, ?, ?, ?)",
		ownerID, req.Name, accessToken, chairRegisterToken,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Path:  "/",
		Name:  "owner_session",
		Value: accessToken,
	})

	writeJSON(w, http.StatusCreated, &ownerPostRegisterResponse{
		ID:                 ownerID,
		ChairRegisterToken: chairRegisterToken,
	})
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

type ownerGetSalesResponse struct {
	TotalSales int          `json:"total_sales"`
	Chairs     []ChairSales `json:"chairs"`
	Models     []ModelSales `json:"models"`
}

func ownerGetSales(w http.ResponseWriter, r *http.Request) {
	since := time.Unix(0, 0)
	until := time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC)
	if r.URL.Query().Get("since") != "" {
		parsed, err := strconv.ParseInt(r.URL.Query().Get("since"), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, err)
		}
		since = time.UnixMilli(parsed)
	}
	if r.URL.Query().Get("until") != "" {
		parsed, err := strconv.ParseInt(r.URL.Query().Get("until"), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, err)
		}
		until = time.UnixMilli(parsed)
	}

	owner := r.Context().Value("owner").(*Owner)

	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	chairs := []Chair{}
	if err := tx.Select(&chairs, "SELECT * FROM chairs WHERE owner_id = ?", owner.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	res := ownerGetSalesResponse{
		TotalSales: 0,
	}

	modelSalesByModel := map[string]int{}
	for _, chair := range chairs {
		reqs := []RideRequest{}
		if err := db.Select(&reqs, "SELECT ride_requests.* FROM ride_requests JOIN ride_request_statuses ON ride_requests.id = ride_request_statuses.ride_request_id WHERE chair_id = ? AND status = 'COMPLETED' AND updated_at BETWEEN ? AND ?", chair.ID, since, until); err != nil {
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

func sumSales(requests []RideRequest) int {
	sale := 0
	for _, req := range requests {
		sale += calculateSale(req)
	}
	return sale
}

func calculateSale(req RideRequest) int {
	return calculateFare(req.PickupLatitude, req.PickupLongitude, req.DestinationLatitude, req.DestinationLongitude)
}

type ChairWithDetail struct {
	ID                     string       `db:"id"`
	OwnerID                string       `db:"owner_id"`
	Name                   string       `db:"name"`
	AccessToken            string       `db:"access_token"`
	Model                  string       `db:"model"`
	IsActive               bool         `db:"is_active"`
	CreatedAt              time.Time    `db:"created_at"`
	UpdatedAt              time.Time    `db:"updated_at"`
	TotalDistance          int          `db:"total_distance"`
	TotalDistanceUpdatedAt sql.NullTime `db:"total_distance_updated_at"`
}

type ownerChair struct {
	ID                     string `json:"id"`
	Name                   string `json:"name"`
	Model                  string `json:"model"`
	Active                 bool   `json:"active"`
	RegisteredAt           int64  `json:"registered_at"`
	TotalDistance          int    `json:"total_distance"`
	TotalDistanceUpdatedAt *int64 `json:"total_distance_updated_at,omitempty"`
}

type ownerGetChairResponse struct {
	Chairs []ownerChair `json:"chairs"`
}

func ownerGetChairs(w http.ResponseWriter, r *http.Request) {
	owner := r.Context().Value("owner").(*Owner)

	chairs := []ChairWithDetail{}
	if err := db.Select(&chairs, `SELECT id,
       owner_id,
       name,
       access_token,
       model,
       is_active,
       created_at,
       updated_at,
       IFNULL(total_distance, 0) AS total_distance,
       total_distance_updated_at
FROM chairs
       LEFT JOIN (SELECT chair_id,
                          SUM(IFNULL(distance, 0)) AS total_distance,
                          MAX(created_at)          AS total_distance_updated_at
                   FROM (SELECT chair_id,
                                created_at,
                                ABS(latitude - LAG(latitude) OVER (PARTITION BY chair_id ORDER BY created_at)) +
                                ABS(longitude - LAG(longitude) OVER (PARTITION BY chair_id ORDER BY created_at)) AS distance
                         FROM chair_locations) tmp
                   GROUP BY chair_id) distance_table ON distance_table.chair_id = chairs.id
WHERE owner_id = ?
`, owner.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	ids := []struct {
		ID            string
		TotalDistance int
	}{}
	res := ownerGetChairResponse{}
	for _, chair := range chairs {
		c := ownerChair{
			ID:            chair.ID,
			Name:          chair.Name,
			Model:         chair.Model,
			Active:        chair.IsActive,
			RegisteredAt:  chair.CreatedAt.UnixMilli(),
			TotalDistance: chair.TotalDistance,
		}
		ids = append(ids, struct {
			ID            string
			TotalDistance int
		}{ID: chair.ID, TotalDistance: chair.TotalDistance})
		if chair.TotalDistanceUpdatedAt.Valid {
			t := chair.TotalDistanceUpdatedAt.Time.UnixMilli()
			c.TotalDistanceUpdatedAt = &t
		}
		res.Chairs = append(res.Chairs, c)
	}
	writeJSON(w, http.StatusOK, res)
}

type ownerGetChairDetailResponse struct {
	ID                     string `json:"id"`
	Name                   string `json:"name"`
	Model                  string `json:"model"`
	Active                 bool   `json:"active"`
	RegisteredAt           int64  `json:"registered_at"`
	TotalDistance          int    `json:"total_distance"`
	TotalDistanceUpdatedAt *int64 `json:"total_distance_updated_at,omitempty"`
}

func ownerGetChairDetail(w http.ResponseWriter, r *http.Request) {
	chairID := r.PathValue("chair_id")

	owner := r.Context().Value("owner").(*Owner)

	chair := ChairWithDetail{}
	if err := db.Get(&chair, `SELECT id,
       owner_id,
       name,
       access_token,
       model,
       is_active,
       created_at,
       updated_at,
       IFNULL(total_distance, 0) AS total_distance,
       total_distance_updated_at
FROM chairs
       LEFT JOIN (SELECT chair_id,
                          SUM(IFNULL(distance, 0)) AS total_distance,
                          MAX(created_at)          AS total_distance_updated_at
                   FROM (SELECT chair_id,
                                created_at,
                                ABS(latitude - LAG(latitude) OVER (PARTITION BY chair_id ORDER BY created_at)) +
                                ABS(longitude - LAG(longitude) OVER (PARTITION BY chair_id ORDER BY created_at)) AS distance
                         FROM chair_locations) tmp
                   GROUP BY chair_id) distance_table ON distance_table.chair_id = chairs.id
WHERE owner_id = ? AND id = ?`, owner.ID, chairID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, errors.New("chair not found"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	resp := ownerGetChairDetailResponse{
		ID:            chair.ID,
		Name:          chair.Name,
		Model:         chair.Model,
		Active:        chair.IsActive,
		RegisteredAt:  chair.CreatedAt.UnixMilli(),
		TotalDistance: chair.TotalDistance,
	}
	if chair.TotalDistanceUpdatedAt.Valid {
		t := chair.TotalDistanceUpdatedAt.Time.UnixMilli()
		resp.TotalDistanceUpdatedAt = &t
	}
	writeJSON(w, http.StatusOK, resp)
}
