package main

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/oklog/ulid/v2"
)

type postAppRegisterRequest struct {
	Username    string `json:"username"`
	FirstName   string `json:"firstname"`
	LastName    string `json:"lastname"`
	DateOfBirth string `json:"date_of_birth"`
}

type postAppRegisterResponse struct {
	AccessToken string `json:"access_token"`
	ID          string `json:"id"`
}

func postAppRegister(w http.ResponseWriter, r *http.Request) {
	req := &postAppRegisterRequest{}
	if err := bindJSON(r, req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	userID := ulid.Make().String()

	if req.Username == "" || req.FirstName == "" || req.LastName == "" || req.DateOfBirth == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	accessToken := secureRandomStr(32)
	_, err := db.Exec(
		"INSERT INTO users (id, username, firstname, lastname, date_of_birth, access_token) VALUES (?, ?, ?, ?, ?, ?)",
		userID, req.Username, req.FirstName, req.LastName, req.DateOfBirth, accessToken,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, &postAppRegisterResponse{
		AccessToken: accessToken,
		ID:          userID,
	})
}

func appAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accessToken := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if accessToken == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		user := &User{}
		err := db.Get(user, "SELECT * FROM users WHERE accesstoken = ?", accessToken)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "user", user)
		next(w, r.WithContext(ctx))
	}
}

type postAppRequestsRequest struct {
	PickupCoordinate      Coordinate `json:"pickup_coordinate"`
	DestinationCoordinate Coordinate `json:"destination_coordinate"`
}

type postAppRequestsResponse struct {
	RequestID string `json:"request_id"`
}

func postAppRequests(w http.ResponseWriter, r *http.Request) {
	req := &postAppRequestsRequest{}
	if err := bindJSON(r, req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	user := r.Context().Value("user").(*User)

	if req.PickupCoordinate.Latitude == 0 || req.PickupCoordinate.Longitude == 0 ||
		req.DestinationCoordinate.Latitude == 0 || req.DestinationCoordinate.Longitude == 0 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	requestID := ulid.Make().String()
	_, err := db.Exec(
		`INSERT INTO ride_requests (id, user_id, status, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude) 
				  VALUES (?, ?, ?, ?, ?, ?, ?)`,
		requestID, user.ID, "MATCHING", req.PickupCoordinate.Latitude, req.PickupCoordinate.Longitude, req.DestinationCoordinate.Latitude, req.DestinationCoordinate.Longitude,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	for {
		// TODO: トランザクションを利用する
		driver := &Driver{}
		err := db.Get(
			driver,
			`SELECT * FROM drivers WHERE is_active = 1 ORDER BY RAND() LIMIT 1`,
		)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				time.Sleep(1 * time.Second)
				continue
			}
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		_, err = db.Exec(
			`UPDATE ride_requests SET driver_id = ?, status = ? WHERE id = ?`,
			driver.ID, "DISPATCHING", requestID,
		)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		break
	}

	respondJSON(w, http.StatusAccepted, &postAppRequestsResponse{
		RequestID: requestID,
	})
}

type simpleDriver struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	CarModel string `json:"car_model"`
	CarNo    string `json:"car_no"`
}

type getAppRequestResponse struct {
	RequestID             string       `json:"request_id"`
	PickupCoordinate      Coordinate   `json:"pickup_coordinate"`
	DestinationCoordinate Coordinate   `json:"destination_coordinate"`
	Status                string       `json:"status"`
	Driver                simpleDriver `json:"driver"`
	CreatedAt             int64        `json:"created_at"`
	UpdateAt              int64        `json:"updated_at"`
}

func getAppRequest(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	rideRequest := &RideRequest{}
	err := db.Get(
		rideRequest,
		`SELECT * FROM ride_requests WHERE id = ?`,
		requestID,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	response := &getAppRequestResponse{
		RequestID:             rideRequest.ID,
		PickupCoordinate:      Coordinate{Latitude: rideRequest.PickupLatitude, Longitude: rideRequest.PickupLongitude},
		DestinationCoordinate: Coordinate{Latitude: rideRequest.DestinationLatitude, Longitude: rideRequest.DestinationLongitude},
		Status:                rideRequest.Status,
		CreatedAt:             rideRequest.RequestedAt.Unix(),
		UpdateAt:              rideRequest.UpdatedAt.Unix(),
	}

	driver := &Driver{}
	if rideRequest.DriverID != "" {
		err := db.Get(
			driver,
			`SELECT * FROM drivers WHERE id = ?`,
			rideRequest.DriverID,
		)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		response.Driver = simpleDriver{
			ID:       driver.ID,
			Name:     driver.Firstname + " " + driver.Lastname,
			CarModel: driver.CarModel,
			CarNo:    driver.CarNo,
		}
	}

	respondJSON(w, http.StatusOK, response)
}

type postAppEvaluateRequest struct {
	RequestID  string `json:"request_id"`
	Evaluation int    `json:"evaluation"`
}

func postAppEvaluate(w http.ResponseWriter, r *http.Request) {
	postAppEvaluateRequest := &postAppEvaluateRequest{}
	if err := bindJSON(r, postAppEvaluateRequest); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := db.Exec(
		`UPDATE ride_requests SET evaluation = ? WHERE id = ?`,
		postAppEvaluateRequest.Evaluation, postAppEvaluateRequest.RequestID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if count, err := result.RowsAffected(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	} else if count == 0 {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func getAppNotification(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

type postAppInquiryRequest struct {
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

func postAppInquiry(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(*User)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	req := &postAppInquiryRequest{}
	if err := bindJSON(r, req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	_, err := db.Exec(
		`INSERT INTO inquiries (user_id, subject, body) VALUES (?, ?, ?)`,
		user.ID, req.Subject, req.Body,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
