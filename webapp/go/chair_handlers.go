package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/oklog/ulid/v2"
)

type postChairRegisterRequest struct {
	Name  string `json:"name"`
	Model string `json:"model"`
}

type postChairRegisterResponse struct {
	AccessToken string `json:"access_token"`
	ID          string `json:"id"`
}

func chairPostRegister(w http.ResponseWriter, r *http.Request) {
	owner := r.Context().Value("owner").(*Owner)

	req := &postChairRegisterRequest{}
	if err := bindJSON(r, req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	chairID := ulid.Make().String()

	if req.Name == "" || req.Model == "" {
		writeError(w, http.StatusBadRequest, errors.New("some of required fields(name, model) are empty"))
		return
	}

	accessToken := secureRandomStr(32)
	_, err := db.Exec(
		"INSERT INTO chairs (id, owner_id, name, model, is_active, access_token) VALUES (?, ?, ?, ?, ?, ?)",
		chairID, owner.ID, req.Name, req.Model, false, accessToken,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusCreated, &postChairRegisterResponse{
		AccessToken: accessToken,
		ID:          chairID,
	})
}

func chairPostActivate(w http.ResponseWriter, r *http.Request) {
	chair := r.Context().Value("chair").(*Chair)

	_, err := db.Exec("UPDATE chairs SET is_active = ? WHERE id = ?", true, chair.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func chairPostDeactivate(w http.ResponseWriter, r *http.Request) {
	chair := r.Context().Value("chair").(*Chair)

	_, err := db.Exec("UPDATE chairs SET is_active = ? WHERE id = ?", false, chair.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
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
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	chairLocationID := ulid.Make().String()
	defer tx.Rollback()
	if _, err := tx.Exec(
		`INSERT INTO chair_locations (id, chair_id, latitude, longitude) VALUES (?, ?, ?, ?)`,
		chairLocationID, chair.ID, req.Latitude, req.Longitude,
	); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	location := &ChairLocation{}
	if err := tx.Get(location, `SELECT * FROM chair_locations WHERE id = ?`, chairLocationID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	rideRequest := &RideRequest{}
	if err := tx.Get(rideRequest, `SELECT * FROM ride_requests WHERE chair_id = ? ORDER BY updated_at DESC LIMIT 1`, chair.ID); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	} else {
		status, err := getLatestRideRequestStatus(tx, rideRequest.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		if status != "COMPLETED" && status != "CANCELED" {
			if req.Latitude == rideRequest.PickupLatitude && req.Longitude == rideRequest.PickupLongitude && status == "DISPATCHING" {
				if _, err := tx.Exec("INSERT INTO ride_request_statuses (id, ride_request_id, status) VALUES (?, ?, ?)", ulid.Make().String(), rideRequest.ID, "DISPATCHED"); err != nil {
					writeError(w, http.StatusInternalServerError, err)
					return
				}
			}

			if req.Latitude == rideRequest.DestinationLatitude && req.Longitude == rideRequest.DestinationLongitude && status == "CARRYING" {
				if _, err := tx.Exec("INSERT INTO ride_request_statuses (id, ride_request_id, status) VALUES (?, ?, ?)", ulid.Make().String(), rideRequest.ID, "ARRIVED"); err != nil {
					writeError(w, http.StatusInternalServerError, err)
					return
				}
			}
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"datetime": location.CreatedAt,
	})
}

func chairGetNotification(w http.ResponseWriter, r *http.Request) {
	chair := r.Context().Value("chair").(*Chair)
	found := true
	rideRequest := &RideRequest{}
	status := ""
	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("SELECT * FROM chairs WHERE id = ? FOR UPDATE", chair.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Get(rideRequest, `SELECT * FROM ride_requests WHERE chair_id = ? ORDER BY updated_at DESC LIMIT 1`, chair.ID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			found = false
		} else {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}

	if found {
		status, err = getLatestRideRequestStatus(tx, rideRequest.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}

	if !found || status == "COMPLETED" || status == "CANCELED" {
		matchRequest := &RideRequest{}
		// TODO: いい感じに椅子とユーザーをマッチングさせる
		// MEMO: 多分距離と椅子の移動速度が関係しそう
		if err := tx.Get(matchRequest, `SELECT * FROM ride_requests WHERE chair_id IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE`); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		if _, err := tx.Exec("UPDATE ride_requests SET chair_id = ? WHERE id = ?", chair.ID, matchRequest.ID); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		if !found {
			rideRequest = matchRequest
			status = "MATCHING"
		}
	}

	user := &User{}
	err = tx.Get(user, "SELECT * FROM users WHERE id = ?", rideRequest.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, &getChairRequestResponse{
		RequestID: rideRequest.ID,
		User: simpleUser{
			ID:   user.ID,
			Name: fmt.Sprintf("%s %s", user.Firstname, user.Lastname),
		},
		PickupCoordinate: Coordinate{
			Latitude:  rideRequest.PickupLatitude,
			Longitude: rideRequest.PickupLongitude,
		},
		DestinationCoordinate: Coordinate{
			Latitude:  rideRequest.DestinationLatitude,
			Longitude: rideRequest.DestinationLongitude,
		},
		Status: status,
	})
}

func chairGetNotificationSSE(w http.ResponseWriter, r *http.Request) {
	chair := r.Context().Value("chair").(*Chair)

	// Server Sent Events
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")

	var lastRideRequest *RideRequest
	var lastRideRequestStatus string
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

				status, err := getLatestRideRequestStatus(tx, rideRequest.ID)
				if err != nil {
					return err
				}

				if !found || status == "COMPLETED" || status == "CANCELED" {
					matchRequest := &RideRequest{}
					// TODO: いい感じに椅子とユーザーをマッチングさせる
					// MEMO: 多分距離と椅子の移動速度が関係しそう
					if err := tx.Get(matchRequest, `SELECT * FROM ride_requests WHERE chair_id IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE`); err != nil {
						if errors.Is(err, sql.ErrNoRows) {
							return nil
						}
						return err
					}

					if _, err := tx.Exec("UPDATE ride_requests SET chair_id = ? WHERE id = ?", chair.ID, matchRequest.ID); err != nil {
						return err
					}

					if !found {
						rideRequest = matchRequest
					}
				}

				if lastRideRequest != nil && rideRequest.ID == lastRideRequest.ID && status == lastRideRequestStatus {
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
						Name: fmt.Sprintf("%s %s", user.Firstname, user.Lastname),
					},
					PickupCoordinate: Coordinate{
						Latitude:  rideRequest.PickupLatitude,
						Longitude: rideRequest.PickupLongitude,
					},
					DestinationCoordinate: Coordinate{
						Latitude:  rideRequest.DestinationLatitude,
						Longitude: rideRequest.DestinationLongitude,
					},
					Status: status,
				}); err != nil {
					return err
				}
				lastRideRequest = rideRequest
				lastRideRequestStatus = status

				return nil
			}()

			if err != nil {
				writeError(w, http.StatusInternalServerError, err)
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
	PickupCoordinate      Coordinate `json:"pickup_coordinate"`
	DestinationCoordinate Coordinate `json:"destination_coordinate"`
	Status                string     `json:"status"`
}

func chairGetRequest(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	rideRequest := &RideRequest{}
	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if err := tx.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ?", requestID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, errors.New("request not found"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	status, err := getLatestRideRequestStatus(tx, rideRequest.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	user := &User{}
	if err := tx.Get(user, "SELECT * FROM users WHERE id = ?", rideRequest.UserID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, &getChairRequestResponse{
		RequestID: rideRequest.ID,
		User: simpleUser{
			ID:   user.ID,
			Name: fmt.Sprintf("%s %s", user.Firstname, user.Lastname),
		},
		PickupCoordinate: Coordinate{
			Latitude:  rideRequest.PickupLatitude,
			Longitude: rideRequest.PickupLongitude,
		},
		DestinationCoordinate: Coordinate{
			Latitude:  rideRequest.DestinationLatitude,
			Longitude: rideRequest.DestinationLongitude,
		},
		Status: status,
	})
}

func chairPostRequestAccept(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("request_id")

	chair := r.Context().Value("chair").(*Chair)

	rideRequest := &RideRequest{}
	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if err := tx.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ?", requestID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, errors.New("request not found"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.ChairID.String != chair.ID {
		writeError(w, http.StatusBadRequest, errors.New("not assigned to this request"))
		return
	}

	if _, err := tx.Exec("INSERT INTO ride_request_statuses (id, ride_request_id, status) VALUES (?, ?, ?)", ulid.Make().String(), requestID, "DISPATCHING"); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
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
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if err := tx.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ? FOR UPDATE ", requestID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, errors.New("request not found"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.ChairID.String != chair.ID {
		writeError(w, http.StatusBadRequest, errors.New("not assigned to this request"))
		return
	}

	if _, err := tx.Exec("INSERT INTO ride_request_statuses (id, ride_request_id, status) VALUES (?, ?, ?)", ulid.Make().String(), requestID, "MATCHING"); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
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
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	if err := tx.Get(rideRequest, "SELECT * FROM ride_requests WHERE id = ? FOR UPDATE", requestID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, errors.New("request not found"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if rideRequest.ChairID.String != chair.ID {
		writeError(w, http.StatusBadRequest, errors.New("not assigned to this request"))
		return
	}

	status, err := getLatestRideRequestStatus(tx, rideRequest.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if status != "DISPATCHED" {
		writeError(w, http.StatusBadRequest, errors.New("chair has not arrived yet"))
		return
	}

	if _, err := tx.Exec("INSERT INTO ride_request_statuses (id, ride_request_id, status) VALUES (?, ?, ?)", ulid.Make().String(), requestID, "CARRYING"); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
