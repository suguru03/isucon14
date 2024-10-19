package world

type Context struct {
	world *World
}

func NewContext(world *World) *Context {
	return &Context{
		world: world,
	}
}

func (c *Context) CurrentTime() int64 {
	return c.world.Time
}
