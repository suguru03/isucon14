package main

import (
	crand "crypto/rand"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

var db *sqlx.DB

func main() {
	mux := setup()
	slog.Info("Listening on :8080")
	http.ListenAndServe(":8080", mux)
}

func setup() *http.ServeMux {
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

	mux.HandleFunc("POST /app/register", postAppRegister)
	mux.HandleFunc("POST /app/requests", appAuthMiddleware(postAppRequests))
	mux.HandleFunc("GET /app/requests/{request_id}", appAuthMiddleware(getAppRequest))
	mux.HandleFunc("POST /app/requests/{request_id}/evaluate", appAuthMiddleware(postAppEvaluate))
	mux.HandleFunc("GET /app/notification", appAuthMiddleware(getAppNotification))
	mux.HandleFunc("POST /app/inquiry", appAuthMiddleware(postAppInquiry))

	mux.HandleFunc("POST /driver/register", postDriverRegister)
	mux.HandleFunc("POST /driver/activate", driverAuthMiddleware(postDriverActivate))
	mux.HandleFunc("POST /driver/deactivate", driverAuthMiddleware(postDriverDeactivate))
	mux.HandleFunc("POST /driver/coordinate", driverAuthMiddleware(postDriverCoordinate))
	mux.HandleFunc("GET /driver/notification", driverAuthMiddleware(getDriverNotification))
	mux.HandleFunc("GET /driver/requests/{request_id}", driverAuthMiddleware(getDriverRequest))
	mux.HandleFunc("POST /driver/requests/{request_id}/accept", driverAuthMiddleware(postDriverAccept))
	mux.HandleFunc("POST /driver/requests/{request_id}/deny", driverAuthMiddleware(postDriverDeny))
	mux.HandleFunc("POST /driver/requests/{request_id}/depart", driverAuthMiddleware(postDriverDepart))

	mux.HandleFunc("GET /admin/inquiries", getAdminInquiries)
	mux.HandleFunc("GET /admin/inquiries/{inquiry_id}", getAdminInquiry)

	return mux
}

func postInitialize(w http.ResponseWriter, r *http.Request) {
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
