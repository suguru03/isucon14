package world

type Context struct {
	world *World
}

func NewContext(world *World) *Context {
	return &Context{
		world: world,
	}
}
