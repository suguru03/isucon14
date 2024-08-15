package main

import "net/http"

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/initialize", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json;charset=utf-8")
		w.Write([]byte(`{"language":"golang"}`))
	})
	mux.HandleFunc("GET /api/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`pong`))
	})

	http.ListenAndServe(":8080", mux)
}
