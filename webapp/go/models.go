package main

import "time"

type User struct {
	ID          string    `db:"id"`
	Username    string    `db:"username"`
	Firstname   string    `db:"firstname"`
	Lastname    string    `db:"lastname"`
	AccessToken string    `db:"access_token"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

type Driver struct {
	ID        string    `db:"id"`
	Username  string    `db:"username"`
	Firstname string    `db:"firstname"`
	Lastname  string    `db:"lastname"`
	CarModel  string    `db:"car_model"`
	CarNo     string    `db:"car_no"`
	IsActive  bool      `db:"is_active"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

type RideRequest struct {
	ID                   string    `db:"id"`
	UserID               string    `db:"user_id"`
	DriverID             string    `db:"driver_id"`
	Status               string    `db:"status"`
	PickupLatitude       float64   `db:"pickup_latitude"`
	PickupLongitude      float64   `db:"pickup_longitude"`
	DestinationLatitude  float64   `db:"destination_latitude"`
	DestinationLongitude float64   `db:"destination_longitude"`
	Evaluation           int       `db:"evaluation"`
	RequestedAt          time.Time `db:"requested_at"`
	MatchedAt            time.Time `db:"matched_at"`
	DispatchedAt         time.Time `db:"dispatched_at"`
	RodeAt               time.Time `db:"rode_at"`
	ArrivedAt            time.Time `db:"arrived_at"`
	UpdatedAt            time.Time `db:"updated_at"`
}

type DriverLocation struct {
	DriverID  string    `db:"driver_id"`
	Latitude  float64   `db:"latitude"`
	Longitude float64   `db:"longitude"`
	UpdatedAt time.Time `db:"updated_at"`
}

type Inquiry struct {
	ID        string    `db:"id"`
	UserID    string    `db:"user_id"`
	Subject   string    `db:"subject"`
	Body      string    `db:"body"`
	CreatedAt time.Time `db:"created_at"`
}
