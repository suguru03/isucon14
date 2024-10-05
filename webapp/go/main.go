package main

import (
	crand "crypto/rand"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

var db *sqlx.DB

func main() {
	mux := setup()
	slog.Info("Listening on :8080")
	http.ListenAndServe(":8080", mux)
}

func setup() http.Handler {
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

	mux := chi.NewRouter()
	mux.Use(middleware.Logger)
	mux.Use(middleware.Recoverer)
	mux.HandleFunc("POST /api/initialize", postInitialize)

	// app handlers
	{
		mux.HandleFunc("POST /app/register", appPostRegister)

		authedMux := mux.With(appAuthMiddleware)
		authedMux.HandleFunc("POST /app/requests", appPostRequests)
		authedMux.HandleFunc("GET /app/requests/{request_id}", appGetRequest)
		authedMux.HandleFunc("POST /app/requests/{request_id}/evaluate", appPostRequestEvaluate)
		authedMux.HandleFunc("GET /app/notification", appGetNotification)
		authedMux.HandleFunc("POST /app/inquiry", appPostInquiry)
	}

	// chair handlers
	{
		mux.HandleFunc("POST /chair/register", chairPostRegister)

		authedMux := mux.With(chairAuthMiddleware)
		authedMux.HandleFunc("POST /chair/activate", chairPostActivate)
		authedMux.HandleFunc("POST /chair/deactivate", chairPostDeactivate)
		authedMux.HandleFunc("POST /chair/coordinate", chairPostCoordinate)
		authedMux.HandleFunc("GET /chair/notification", chairGetNotification)
		authedMux.HandleFunc("GET /chair/requests/{request_id}", chairGetRequest)
		authedMux.HandleFunc("POST /chair/requests/{request_id}/accept", charitPostRequestAccept)
		authedMux.HandleFunc("POST /chair/requests/{request_id}/deny", chairPostRequestDeny)
		authedMux.HandleFunc("POST /chair/requests/{request_id}/depart", chairPostRequestDepart)
	}

	// admin
	{
		mux.HandleFunc("GET /admin/inquiries", adminGetInquiries)
		mux.HandleFunc("GET /admin/inquiries/{inquiry_id}", adminGetInquiry)
	}

	return mux
}

func postInitialize(w http.ResponseWriter, r *http.Request) {
	tables := []string{
		"chair_locations",
		"ride_requests",
		"inquiries",
		"users",
		"chairs",
	}
	tx, err := db.Beginx()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	tx.MustExec("SET FOREIGN_KEY_CHECKS = 0")
	for _, table := range tables {
		_, err := tx.Exec("TRUNCATE TABLE " + table)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}
	tx.MustExec("SET FOREIGN_KEY_CHECKS = 1")
	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=utf-8")
	w.Write([]byte(`{"language":"golang"}`))
}

type Coordinate struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
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

func writeSSE(w http.ResponseWriter, event string, data interface{}) error {
	_, err := w.Write([]byte("event: " + event + "\n"))
	if err != nil {
		return err
	}

	buf, err := json.Marshal(data)
	if err != nil {
		return err
	}
	_, err = w.Write([]byte("data: " + string(buf) + "\n\n"))
	if err != nil {
		return err
	}

	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	return nil
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
