package main

import (
	"context"
	crand "crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/oklog/ulid/v2"
)

var db *sqlx.DB

func main() {
	dbConfig := &mysql.Config{
		User:      "isucon",
		Passwd:    "isucon",
		Net:       "tcp",
		Addr:      "localhost:3306",
		DBName:    "isucon",
		ParseTime: true,
	}

	_db, err := sqlx.Connect("mysql", dbConfig.FormatDSN())
	if err != nil {
		panic(err)
	}
	db = _db

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/initialize", postInitialize)

	mux.HandleFunc("GET /app/request/{request_id}", getAppRequest)
	mux.HandleFunc("POST /app/requests/{request_id}/evaluate", postAppEvaluate)
	mux.HandleFunc("GET /app/notification", getAppNotification)

	mux.HandleFunc("GET /driver/requests/{request_id}", getDriverRequest)
	mux.HandleFunc("POST /driver/requests/{request_id}/deny", postDriverDeny)
	mux.HandleFunc("POST /driver/requests/{request_id}/depart", postDriverDepart)

	mux.HandleFunc("POST /app/register", postAppRegister)
	mux.HandleFunc("POST /app/requests", postAppRequests)
	mux.HandleFunc("POST /app/inquiry", postAppInquiry)

	mux.HandleFunc("POST /driver/register", postDriverRegister)
	mux.HandleFunc("POST /driver/activate", postDriverActivate)
	mux.HandleFunc("POST /driver/deactivate", postDriverDeactivate)

	mux.HandleFunc("POST /driver/coordinate", postDriverCoordinate)

	mux.HandleFunc("POST /admin/inquiries", postAdminInquiries)
	mux.HandleFunc("GET /admin/inquiries/{inquiry_id}", getAdminInquiry)

	http.ListenAndServe(":8080", mux)
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

func postInitialize(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json;charset=utf-8")
	w.Write([]byte(`{"language":"golang"}`))
}

func getAppRequest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func postAppEvaluate(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func getAppNotification(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func getDriverRequest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func postDriverDeny(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func postDriverDepart(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

type postAppRegisterRequest struct {
	Username    string `json:"username"`
	FirstName   string `json:"firstname"`
	LastName    string `json:"lastname"`
	DateOfBirth string `json:"date_of_birth"`
}

type postAppRegisterResponse struct {
	AccessToken string `json:"access_token"`
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
		"INSERT INTO users (id, username, firstname, lastname, date_of_birth, accesstoken) VALUES (?, ?, ?, ?, ?, ?)",
		userID, req.Username, req.FirstName, req.LastName, req.DateOfBirth, accessToken,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, &postAppRegisterResponse{
		AccessToken: accessToken,
	})
}

type Coordinate struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
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
		time.Sleep(1 * time.Second)

	}

	respondJSON(w, http.StatusCreated, &postAppRequestsResponse{
		RequestID: requestID,
	})
}

func postAppInquiry(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func postDriverRegister(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func postDriverActivate(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func postDriverDeactivate(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func postDriverCoordinate(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func postAdminInquiries(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func getAdminInquiry(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func bindJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func respondJSON(w http.ResponseWriter, statusCode int, v interface{}) {
	w.Header().Set("Content-Type", "application/json;charset=utf-8")
	w.WriteHeader(statusCode)
	buf, err := json.Marshal(v)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write(buf)
	return
}

func respondError(w http.ResponseWriter, statusCode int, err error) {
	w.Header().Set("Content-Type", "application/json;charset=utf-8")
	w.WriteHeader(statusCode)
	buf, marshalError := json.Marshal(map[string]string{"error": err.Error()})
	if marshalError != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"marshaling error failed"}`))
		return
	}
	w.Write(buf)
	return
}

func secureRandomStr(b int) string {
	k := make([]byte, b)
	if _, err := crand.Read(k); err != nil {
		panic(err)
	}
	return fmt.Sprintf("%x", k)
}
