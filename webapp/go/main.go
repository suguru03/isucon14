package main

import (
	crand "crypto/rand"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strconv"

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
	host := os.Getenv("ISUCON_DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("ISUCON_DB_PORT")
	if port == "" {
		port = "3306"
	}
	_, err := strconv.Atoi(port)
	if err != nil {
		panic(fmt.Sprintf("failed to convert DB port number from DB_PORT environment variable into int: %v", err))
	}
	user := os.Getenv("ISUCON_DB_USER")
	if user == "" {
		user = "isucon"
	}
	password := os.Getenv("ISUCON_DB_PASSWORD")
	if password == "" {
		password = "isucon"
	}
	dbname := os.Getenv("ISUCON_DB_NAME")
	if dbname == "" {
		dbname = "isuride"
	}

	dbConfig := &mysql.Config{
		User:      user,
		Passwd:    password,
		Net:       "tcp",
		Addr:      net.JoinHostPort(host, port),
		DBName:    dbname,
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
		authedMux.HandleFunc("POST /app/payment-methods", appPostPaymentMethods)
		authedMux.HandleFunc("POST /app/requests", appPostRequests)
		authedMux.HandleFunc("GET /app/requests/{request_id}", appGetRequest)
		authedMux.HandleFunc("POST /app/requests/{request_id}/evaluate", appPostRequestEvaluate)
		//authedMux.HandleFunc("GET /app/notification", appGetNotificationSSE)
		authedMux.HandleFunc("GET /app/notification", appGetNotification)
		authedMux.HandleFunc("GET /app/nearby-chairs", appGetNearbyChairs)
	}

	// owner handlers
	{
		mux.HandleFunc("POST /owner/register", ownerPostRegister)

		authedMux := mux.With(ownerAuthMiddleware)
		authedMux.HandleFunc("GET /owner/sales", ownerGetSales)
		authedMux.HandleFunc("GET /owner/chairs", ownerGetChairs)
		authedMux.HandleFunc("GET /owner/chairs/{chair_id}", ownerGetChairDetail)
	}

	// chair handlers
	{
		authedMux1 := mux.With(ownerAuthMiddleware)
		authedMux1.HandleFunc("POST /chair/register", chairPostRegister)

		authedMux2 := mux.With(chairAuthMiddleware)
		authedMux2.HandleFunc("POST /chair/activate", chairPostActivate)
		authedMux2.HandleFunc("POST /chair/deactivate", chairPostDeactivate)
		authedMux2.HandleFunc("POST /chair/coordinate", chairPostCoordinate)
		//authedMux2.HandleFunc("GET /chair/notification", chairGetNotificationSSE)
		authedMux2.HandleFunc("GET /chair/notification", chairGetNotification)
		authedMux2.HandleFunc("GET /chair/requests/{request_id}", chairGetRequest)
		authedMux2.HandleFunc("POST /chair/requests/{request_id}/accept", chairPostRequestAccept)
		authedMux2.HandleFunc("POST /chair/requests/{request_id}/deny", chairPostRequestDeny)
		authedMux2.HandleFunc("POST /chair/requests/{request_id}/depart", chairPostRequestDepart)
	}

	return mux
}

type postInitializeRequest struct {
	PaymentServer string `json:"payment_server"`
}

func postInitialize(w http.ResponseWriter, r *http.Request) {
	req := &postInitializeRequest{}
	if err := bindJSON(r, req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	if out, err := exec.Command("../sql/init.sh").CombinedOutput(); err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Errorf("failed to initialize: %s: %w", string(out), err))
		return
	}

	paymentURL = req.PaymentServer
	writeJSON(w, http.StatusOK, map[string]string{"language": "go"})
}

type Coordinate struct {
	Latitude  int `json:"latitude"`
	Longitude int `json:"longitude"`
}

func bindJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func writeJSON(w http.ResponseWriter, statusCode int, v interface{}) {
	buf, err := json.Marshal(v)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(statusCode)
	w.Header().Set("Content-Type", "application/json;charset=utf-8")
	w.Write(buf)
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

func writeError(w http.ResponseWriter, statusCode int, err error) {
	w.Header().Set("Content-Type", "application/json;charset=utf-8")
	w.WriteHeader(statusCode)
	buf, marshalError := json.Marshal(map[string]string{"message": err.Error()})
	if marshalError != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"marshaling error failed"}`))
		return
	}
	w.Write(buf)

	fmt.Fprintln(os.Stderr, err)
}

func secureRandomStr(b int) string {
	k := make([]byte, b)
	if _, err := crand.Read(k); err != nil {
		panic(err)
	}
	return fmt.Sprintf("%x", k)
}
