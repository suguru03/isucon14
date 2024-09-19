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
