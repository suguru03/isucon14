package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/oklog/ulid/v2"
)

type postDriverRegisterRequest struct {
	Username    string `json:"username"`
	Firstname   string `json:"firstname"`
	Lastname    string `json:"lastname"`
	DateOfBirth string `json:"date_of_birth"`
	CarModel    string `json:"car_model"`
	CarNo       string `json:"car_no"`
}

type postDriverRegisterResponse struct {
	AccessToken string `json:"access_token"`
	ID          string `json:"id"`
}

func postDriverRegister(w http.ResponseWriter, r *http.Request) {
	req := &postDriverRegisterRequest{}
	if err := bindJSON(r, req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	driverID := ulid.Make().String()

	if req.Username == "" || req.Firstname == "" || req.Lastname == "" || req.DateOfBirth == "" || req.CarModel == "" || req.CarNo == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	accessToken := secureRandomStr(32)
	_, err := db.Exec(
		"INSERT INTO drivers (id, username, firstname, lastname, date_of_birth, car_model, car_no, is_active, access_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		driverID, req.Username, req.Firstname, req.Lastname, req.DateOfBirth, req.CarModel, req.CarNo, false, accessToken,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, &postDriverRegisterResponse{
		AccessToken: accessToken,
		ID:          driverID,
	})
}

func driverAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accessToken := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if accessToken == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		driver := &Driver{}
		err := db.Get(driver, "SELECT * FROM drivers WHERE access_token = ?", accessToken)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "driver", driver)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func postDriverActivate(w http.ResponseWriter, r *http.Request) {
	driver, ok := r.Context().Value("driver").(*Driver)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	_, err := db.Exec("UPDATE drivers SET is_active = ? WHERE id = ?", true, driver.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func postDriverDeactivate(w http.ResponseWriter, r *http.Request) {
	driver, ok := r.Context().Value("driver").(*Driver)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	_, err := db.Exec("UPDATE drivers SET is_active = ? WHERE id = ?", false, driver.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func postDriverCoordinate(w http.ResponseWriter, r *http.Request) {
	req := &Coordinate{}
	if err := bindJSON(r, req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	driver, ok := r.Context().Value("driver").(*Driver)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	_, err := db.Exec(
		`INSERT INTO driver_locations (driver_id, latitude, longitude) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE latitude = ?, longitude = ?`,
		driver.ID, req.Latitude, req.Longitude, req.Latitude, req.Longitude,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func getDriverNotification(w http.ResponseWriter, r *http.Request) {
	driver, ok := r.Context().Value("driver").(*Driver)
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
			err := db.Get(rideRequest, "SELECT * FROM ride_requests WHERE driver_id = ? AND status = ?", driver.ID, "DISPATCHING")
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

			if err := writeSSE(w, "matched", &getDriverRequestResponse{
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

type getDriverRequestResponse struct {
	RequestID             string     `json:"request_id"`
	User                  simpleUser `json:"user"`
	DestinationCoordinate Coordinate `json:"destination_coordinate"`
	Status                string     `json:"status"`
}

func getDriverRequest(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	rideRequest := &RideRequest{}
	err := db.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ?", requestID)
	if err != nil {
		log.Println("err", err)
		w.WriteHeader(http.StatusNotFound)
		return
	}

	user := &User{}
	err = db.Get(user, "SELECT * FROM users WHERE id = ?", rideRequest.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, &getDriverRequestResponse{
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

func postDriverAccept(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	driver, ok := r.Context().Value("driver").(*Driver)
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

	if rideRequest.DriverID != driver.ID {
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

func postDriverDeny(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	driver, ok := r.Context().Value("driver").(*Driver)
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

	if rideRequest.DriverID != driver.ID {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	_, err = db.Exec("UPDATE ride_requests SET driver_id = NULL, matched_at = NULL WHERE id = ?", requestID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func postDriverDepart(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	driver, ok := r.Context().Value("driver").(*Driver)
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

	if rideRequest.DriverID != driver.ID {
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
