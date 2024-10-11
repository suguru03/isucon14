package main

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"
)

func appAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accessToken := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if accessToken == "" {
			writeError(w, http.StatusUnauthorized, errors.New("access token is required"))
			return
		}

		user := &User{}
		err := db.Get(user, "SELECT * FROM users WHERE access_token = ?", accessToken)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusUnauthorized, errors.New("invalid access token"))
				return
			}
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		ctx := context.WithValue(r.Context(), "user", user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func providerAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accessToken := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if accessToken == "" {
			writeError(w, http.StatusUnauthorized, errors.New("access token is required"))
			return
		}

		provider := &Provider{}
		if err := db.Get(provider, "SELECT * FROM providers WHERE access_token = ?", accessToken); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusUnauthorized, errors.New("invalid access token"))
				return
			}
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		ctx := context.WithValue(r.Context(), "provider", provider)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func chairAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accessToken := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if accessToken == "" {
			writeError(w, http.StatusUnauthorized, errors.New("access token is required"))
			return
		}

		chair := &Chair{}
		err := db.Get(chair, "SELECT * FROM chairs WHERE access_token = ?", accessToken)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusUnauthorized, errors.New("invalid access token"))
				return
			}
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		ctx := context.WithValue(r.Context(), "chair", chair)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
