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

type postChairRegisterRequest struct {
	Username    string `json:"username"`
	Firstname   string `json:"firstname"`
	Lastname    string `json:"lastname"`
	DateOfBirth string `json:"date_of_birth"`
	CarModel    string `json:"car_model"`
	CarNo       string `json:"car_no"`
}

type postChairRegisterResponse struct {
	AccessToken string `json:"access_token"`
	ID          string `json:"id"`
}

func chairPostRegister(w http.ResponseWriter, r *http.Request) {
	req := &postChairRegisterRequest{}
	if err := bindJSON(r, req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	chairID := ulid.Make().String()

	if req.Username == "" || req.Firstname == "" || req.Lastname == "" || req.DateOfBirth == "" || req.CarModel == "" || req.CarNo == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	accessToken := secureRandomStr(32)
	_, err := db.Exec(
		"INSERT INTO chairs (id, username, firstname, lastname, date_of_birth, car_model, car_no, is_active, access_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		chairID, req.Username, req.Firstname, req.Lastname, req.DateOfBirth, req.CarModel, req.CarNo, false, accessToken,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, &postChairRegisterResponse{
		AccessToken: accessToken,
		ID:          chairID,
	})
}

func chairAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accessToken := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if accessToken == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		chair := &Chair{}
		err := db.Get(chair, "SELECT * FROM chairs WHERE access_token = ?", accessToken)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "chair", chair)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func chairPostActivate(w http.ResponseWriter, r *http.Request) {
	chair, ok := r.Context().Value("chair").(*Chair)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	_, err := db.Exec("UPDATE chairs SET is_active = ? WHERE id = ?", true, chair.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostDeactivate(w http.ResponseWriter, r *http.Request) {
	chair, ok := r.Context().Value("chair").(*Chair)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	_, err := db.Exec("UPDATE chairs SET is_active = ? WHERE id = ?", false, chair.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostCoordinate(w http.ResponseWriter, r *http.Request) {
	req := &Coordinate{}
	if err := bindJSON(r, req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	chair, ok := r.Context().Value("chair").(*Chair)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	_, err := db.Exec(
		`INSERT INTO chair_locations (chair_id, latitude, longitude) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE latitude = ?, longitude = ?`,
		chair.ID, req.Latitude, req.Longitude, req.Latitude, req.Longitude,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairGetNotification(w http.ResponseWriter, r *http.Request) {
	chair, ok := r.Context().Value("chair").(*Chair)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Server Sent Events
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")

	for {
		select {
		case <-r.Context().Done():
			w.WriteHeader(http.StatusOK)
			return

		default:
			rideRequest := &RideRequest{}
			err := db.Get(rideRequest, "SELECT * FROM ride_requests WHERE chair_id = ? AND status = ?", chair.ID, "DISPATCHING")
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					time.Sleep(1 * time.Second)
					continue
				}
				w.WriteHeader(http.StatusInternalServerError)
			}

			user := &User{}
			err = db.Get(user, "SELECT * FROM users WHERE id = ?", rideRequest.UserID)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				return
			}

			if err := writeSSE(w, "matched", &getChairRequestResponse{
				RequestID: rideRequest.ID,
				User: simpleUser{
					ID:   user.ID,
					Name: user.Firstname + " " + user.Lastname,
				},
				DestinationCoordinate: Coordinate{
					Latitude:  rideRequest.DestinationLatitude,
					Longitude: rideRequest.DestinationLongitude,
				},
				Status: rideRequest.Status,
			}); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
		}
	}
}

type simpleUser struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type getChairRequestResponse struct {
	RequestID             string     `json:"request_id"`
	User                  simpleUser `json:"user"`
	DestinationCoordinate Coordinate `json:"destination_coordinate"`
	Status                string     `json:"status"`
}

func chairGetRequest(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	rideRequest := &RideRequest{}
	err := db.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ?", requestID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	user := &User{}
	err = db.Get(user, "SELECT * FROM users WHERE id = ?", rideRequest.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, &getChairRequestResponse{
		RequestID: rideRequest.ID,
		User: simpleUser{
			ID:   user.ID,
			Name: user.Firstname + " " + user.Lastname,
		},
		DestinationCoordinate: Coordinate{
			Latitude:  rideRequest.DestinationLatitude,
			Longitude: rideRequest.DestinationLongitude,
		},
		Status: rideRequest.Status,
	})
}

func charitPostRequestAccept(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	chair, ok := r.Context().Value("chair").(*Chair)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// TODO: トランザクションを使って排他制御を行う
	rideRequest := &RideRequest{}
	err := db.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ?", requestID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if rideRequest.ChairID != chair.ID {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	_, err = db.Exec("UPDATE ride_requests SET status = ? WHERE id = ?", "DISPATCHED", requestID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostRequestDeny(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	chaier, ok := r.Context().Value("chaier").(*Chair)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	rideRequest := &RideRequest{}
	err := db.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ?", requestID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if rideRequest.ChairID != chaier.ID {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	_, err = db.Exec("UPDATE ride_requests SET chair_id = NULL, matched_at = NULL WHERE id = ?", requestID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostRequestDepart(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	chair, ok := r.Context().Value("chair").(*Chair)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	rideRequest := &RideRequest{}
	err := db.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ?", requestID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if rideRequest.ChairID != chair.ID {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	_, err = db.Exec("UPDATE ride_requests SET status = ? WHERE id = ?", "CARRYING", requestID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
