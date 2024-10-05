package main

import (
	"context"
	"database/sql"
	"errors"
	"math"
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
	ChairModel  string `json:"chair_model"`
	ChairNo     string `json:"chair_no"`
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

	if req.Username == "" || req.Firstname == "" || req.Lastname == "" || req.DateOfBirth == "" || req.ChairModel == "" || req.ChairNo == "" {
		respondError(w, http.StatusBadRequest, errors.New("required fields(username, firstname, lastname, date_of_birth, chair_model, chair_no) are empty"))
		return
	}

	accessToken := secureRandomStr(32)
	_, err := db.Exec(
		"INSERT INTO chairs (id, username, firstname, lastname, date_of_birth, chair_model, chair_no, is_active, access_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		chairID, req.Username, req.Firstname, req.Lastname, req.DateOfBirth, req.ChairModel, req.ChairNo, false, accessToken,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
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
			respondError(w, http.StatusUnauthorized, errors.New("access token is required"))
			return
		}

		chair := &Chair{}
		err := db.Get(chair, "SELECT * FROM chairs WHERE access_token = ?", accessToken)
		if err != nil {
			respondError(w, http.StatusUnauthorized, errors.New("invalid access token"))
			return
		}

		ctx := context.WithValue(r.Context(), "chair", chair)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func chairPostActivate(w http.ResponseWriter, r *http.Request) {
	chair := r.Context().Value("chair").(*Chair)

	_, err := db.Exec("UPDATE chairs SET is_active = ? WHERE id = ?", true, chair.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostDeactivate(w http.ResponseWriter, r *http.Request) {
	chair := r.Context().Value("chair").(*Chair)

	_, err := db.Exec("UPDATE chairs SET is_active = ? WHERE id = ?", false, chair.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
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

	chair := r.Context().Value("chair").(*Chair)

	tx, err := db.Beginx()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()
	if _, err := tx.Exec(
		`INSERT INTO chair_locations (chair_id, latitude, longitude) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE latitude = ?, longitude = ?`,
		chair.ID, req.Latitude, req.Longitude, req.Latitude, req.Longitude,
	); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	rideRequest := &RideRequest{}
	if err := tx.Get(rideRequest, `SELECT * FROM ride_requests WHERE chair_id = ? AND status NOT IN ('COMPLETED', 'CANCELED')`, chair.ID); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusInternalServerError, err)
			return
		}
	} else {
		// TODO
		if math.Abs(req.Latitude-rideRequest.PickupLatitude) < 0.1 && math.Abs(req.Longitude-rideRequest.PickupLongitude) < 0.1 {
			if _, err := tx.Exec("UPDATE ride_requests SET status = 'DISPATCHED' WHERE id = ? AND status = 'DISPATCHING'", rideRequest.ID); err != nil {
				respondError(w, http.StatusInternalServerError, err)
				return
			}
		}

		if math.Abs(req.Latitude-rideRequest.DestinationLatitude) < 0.1 && math.Abs(req.Longitude-rideRequest.DestinationLongitude) < 0.1 {
			if _, err := tx.Exec("UPDATE ride_requests SET status = 'ARRIVED' WHERE id = ? AND status = 'CARRYING'", rideRequest.ID); err != nil {
				respondError(w, http.StatusInternalServerError, err)
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairGetNotification(w http.ResponseWriter, r *http.Request) {
	chair := r.Context().Value("chair").(*Chair)

	// Server Sent Events
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")

	var lastRideRequest *RideRequest
	for {
		select {
		case <-r.Context().Done():
			w.WriteHeader(http.StatusOK)
			return

		default:
			rideRequest := &RideRequest{}
			err := db.Get(rideRequest, `SELECT * FROM ride_requests WHERE chair_id = ? ORDER BY requested_at DESC LIMIT 1`, chair.ID)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					time.Sleep(100 * time.Millisecond)
					continue
				}
				respondError(w, http.StatusInternalServerError, err)
			}
			if lastRideRequest != nil && rideRequest.ID == lastRideRequest.ID && rideRequest.Status == lastRideRequest.Status {
				time.Sleep(100 * time.Millisecond)
				continue
			}

			user := &User{}
			err = db.Get(user, "SELECT * FROM users WHERE id = ?", rideRequest.UserID)
			if err != nil {
				respondError(w, http.StatusInternalServerError, err)
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
				Status: strings.ToLower(rideRequest.Status),
			}); err != nil {
				respondError(w, http.StatusInternalServerError, err)
				return
			}
			lastRideRequest = rideRequest
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
	tx, err := db.Beginx()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if err := tx.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ?", requestID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, errors.New("request not found"))
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	user := &User{}
	if err := tx.Get(user, "SELECT * FROM users WHERE id = ?", rideRequest.UserID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err)
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
		Status: strings.ToLower(rideRequest.Status),
	})
}

func chairPostRequestAccept(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	chair := r.Context().Value("chair").(*Chair)

	rideRequest := &RideRequest{}
	tx, err := db.Beginx()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if err := tx.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ?", requestID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, errors.New("request not found"))
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.ChairID.String != chair.ID {
		respondError(w, http.StatusBadRequest, errors.New("not assigned to this request"))
		return
	}

	if _, err := tx.Exec("UPDATE ride_requests SET status = ? WHERE id = ?", "DISPATCHING", requestID); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostRequestDeny(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	chair := r.Context().Value("chair").(*Chair)

	rideRequest := &RideRequest{}
	tx, err := db.Beginx()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if err := tx.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ? FOR UPDATE ", requestID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, errors.New("request not found"))
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.ChairID.String != chair.ID {
		respondError(w, http.StatusBadRequest, errors.New("not assigned to this request"))
		return
	}

	if _, err := tx.Exec("UPDATE ride_requests SET chair_id = NULL, status = 'MATCHING', matched_at = NULL WHERE id = ?", requestID); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostRequestDepart(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	chair := r.Context().Value("chair").(*Chair)

	rideRequest := &RideRequest{}
	tx, err := db.Beginx()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if err := tx.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ? FOR UPDATE", requestID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, errors.New("request not found"))
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.ChairID.String != chair.ID {
		respondError(w, http.StatusBadRequest, errors.New("not assigned to this request"))
		return
	}

	if _, err = tx.Exec("UPDATE ride_requests SET status = ? WHERE id = ?", "CARRYING", requestID); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
