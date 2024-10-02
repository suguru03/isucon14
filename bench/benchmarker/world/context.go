package world

import "math/rand/v2"

type Context struct {
	world  *World
	rand   *rand.Rand
	client Client
}
