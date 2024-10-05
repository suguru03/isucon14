package world

type Context struct {
	world  *World
	client Client
}

func NewContext(world *World, client Client) *Context {
	return &Context{
		world:  world,
		client: client,
	}
}
