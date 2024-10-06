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
		"INSERT INTO chairs (id, username, firstname, lastname, date_of_birth, chair_model, chair_no, is_active, access_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, isu_now(), isu_now())",
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
			if (errors.Is(err, sql.ErrNoRows)) {
				respondError(w, http.StatusUnauthorized, errors.New("access token is required"))
				return
			}
			respondError(w, http.StatusInternalServerError, err)
			return
		}

		ctx := context.WithValue(r.Context(), "chair", chair)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func chairPostActivate(w http.ResponseWriter, r *http.Request) {
	chair := r.Context().Value("chair").(*Chair)

	_, err := db.Exec("UPDATE chairs SET is_active = ?, updated_at = isu_now() WHERE id = ?", true, chair.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostDeactivate(w http.ResponseWriter, r *http.Request) {
	chair := r.Context().Value("chair").(*Chair)

	_, err := db.Exec("UPDATE chairs SET is_active = ?, updated_at = isu_now() WHERE id = ?", false, chair.ID)
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
	chairLocationID := ulid.Make().String()
	if _, err := tx.Exec(
		`INSERT INTO chair_locations (id, chair_id, latitude, longitude, created_at) VALUES (?, ?, ?, ?, isu_now())`,
		chairLocationID, chair.ID, req.Latitude, req.Longitude,
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
		if req.Latitude == rideRequest.PickupLatitude && req.Longitude == rideRequest.PickupLongitude {
			if _, err := tx.Exec("UPDATE ride_requests SET status = 'DISPATCHED', dispatched_at = isu_now(), updated_at = isu_now() WHERE id = ? AND status = 'DISPATCHING'", rideRequest.ID); err != nil {
				respondError(w, http.StatusInternalServerError, err)
				return
			}
		}

		if req.Latitude == rideRequest.DestinationLatitude && req.Longitude == rideRequest.DestinationLongitude {
			if _, err := tx.Exec("UPDATE ride_requests SET status = 'ARRIVED', arrived_at = isu_now(), updated_at = isu_now() WHERE id = ? AND status = 'CARRYING'", rideRequest.ID); err != nil {
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
	found := true
	rideRequest := &RideRequest{}
	tx, err := db.Beginx()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("SELECT * FROM chairs WHERE id = ? FOR UPDATE", chair.ID); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Get(rideRequest, `SELECT * FROM ride_requests WHERE chair_id = ? ORDER BY updated_at DESC LIMIT 1`, chair.ID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			found = false
		} else {
			respondError(w, http.StatusInternalServerError, err)
			return
		}
	}

	if !found || rideRequest.Status == "COMPLETED" || rideRequest.Status == "CANCELED" {
		matchRequest := &RideRequest{}
		if err := tx.Get(matchRequest, `SELECT * FROM ride_requests WHERE status = 'MATCHING' AND chair_id IS NULL ORDER BY RAND() LIMIT 1 FOR UPDATE`); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			respondError(w, http.StatusInternalServerError, err)
			return
		}

		if _, err := tx.Exec("UPDATE ride_requests SET chair_id = ?, matched_at = isu_now(), updated_at = isu_now() WHERE id = ?", chair.ID, matchRequest.ID); err != nil {
			respondError(w, http.StatusInternalServerError, err)
			return
		}

		if !found {
			rideRequest = matchRequest
		}
	}

	user := &User{}
	err = tx.Get(user, "SELECT * FROM users WHERE id = ?", rideRequest.UserID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
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
		Status: rideRequest.Status,
	})
}

func chairGetNotificationSSE(w http.ResponseWriter, r *http.Request) {
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
			err := func() error {
				found := true
				rideRequest := &RideRequest{}
				tx, err := db.Beginx()
				if err != nil {
					return err
				}
				defer tx.Rollback()

				if _, err := tx.Exec("SELECT * FROM chairs WHERE id = ? FOR UPDATE", chair.ID); err != nil {
					return err
				}

				if err := tx.Get(rideRequest, `SELECT * FROM ride_requests WHERE chair_id = ? ORDER BY updated_at DESC LIMIT 1`, chair.ID); err != nil {
					if errors.Is(err, sql.ErrNoRows) {
						found = false
					} else {
						return err
					}
				}

				if !found || rideRequest.Status == "COMPLETED" || rideRequest.Status == "CANCELED" {
					matchRequest := &RideRequest{}
					if err := tx.Get(matchRequest, `SELECT * FROM ride_requests WHERE status = 'MATCHING' AND chair_id IS NULL ORDER BY RAND() LIMIT 1 FOR UPDATE`); err != nil {
						if errors.Is(err, sql.ErrNoRows) {
							return nil
						}
						return err
					}

					if _, err := tx.Exec("UPDATE ride_requests SET chair_id = ?, matched_at = isu_now(), updated_at = isu_now() WHERE id = ?", chair.ID, matchRequest.ID); err != nil {
						return err
					}

					if !found {
						rideRequest = matchRequest
					}
				}

				if lastRideRequest != nil && rideRequest.ID == lastRideRequest.ID && rideRequest.Status == lastRideRequest.Status {
					return nil
				}

				user := &User{}
				err = tx.Get(user, "SELECT * FROM users WHERE id = ?", rideRequest.UserID)
				if err != nil {
					return err
				}

				if err := tx.Commit(); err != nil {
					return err
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
					return err
				}
				lastRideRequest = rideRequest

				return nil
			}()

			if err != nil {
				respondError(w, http.StatusInternalServerError, err)
				return
			}

			time.Sleep(100 * time.Millisecond)
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
			return
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
		Status: rideRequest.Status,
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
			return
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.ChairID.String != chair.ID {
		respondError(w, http.StatusBadRequest, errors.New("not assigned to this request"))
		return
	}

	if _, err := tx.Exec("UPDATE ride_requests SET status = ?, updated_at = isu_now() WHERE id = ?", "DISPATCHING", requestID); err != nil {
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
			return
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.ChairID.String != chair.ID {
		respondError(w, http.StatusBadRequest, errors.New("not assigned to this request"))
		return
	}

	if _, err := tx.Exec("UPDATE ride_requests SET chair_id = NULL, status = 'MATCHING', matched_at = NULL, updated_at = isu_now() WHERE id = ?", requestID); err != nil {
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
			return
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.ChairID.String != chair.ID {
		respondError(w, http.StatusBadRequest, errors.New("not assigned to this request"))
		return
	}

	if _, err = tx.Exec("UPDATE ride_requests SET status = ?, updated_at = isu_now() WHERE id = ?", "CARRYING", requestID); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostRequestPayment(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	tx, err := db.Beginx()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	rideRequest := &RideRequest{}
	if err := tx.Get(rideRequest, `SELECT * FROM ride_requests WHERE id = ?`, requestID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusNotFound, errors.New("request not found"))
			return
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	paymentToken := &PaymentToken{}
	if err := tx.Get(paymentToken, `SELECT * FROM payment_tokens WHERE user_id = ?`, rideRequest.UserID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(w, http.StatusBadRequest, errors.New("payment token not registered"))
			return
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.Status == "COMPLETED" {
		respondError(w, http.StatusBadRequest, errors.New("already paid"))
		return
	}
	if rideRequest.Status != "ARRIVED" {
		respondError(w, http.StatusBadRequest, errors.New("not arrived yet"))
		return
	}

	paymentGatewayRequest := &paymentGatewayPostPaymentRequest{
		Token: paymentToken.Token,
		// TODO: calculate payment amount
		Amount: 100,
	}
	if err := requestPaymentGatewayPostPayment(paymentGatewayRequest); err != nil {
		if errors.Is(err, erroredUpstream) {
			respondError(w, http.StatusBadGateway, err)
			return
		}
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
