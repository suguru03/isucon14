package world

type Event interface {
	isWorldEvent()
}

type unimplementedEvent struct{}

func (*unimplementedEvent) isWorldEvent() {}

type EventRequestCompleted struct {
	Request *Request

	unimplementedEvent
}
