package world

type NotificationEvent interface {
	isNotificationEvent()
}

type unimplementedNotificationEvent struct{}

func (*unimplementedNotificationEvent) isNotificationEvent() {}

type ChairNotificationEventMatched struct {
	ServerRequestID string
	User            ChairNotificationEventUserPayload
	Pickup          Coordinate
	Destination     Coordinate

	unimplementedNotificationEvent
}

type ChairNotificationEventCompleted struct {
	ServerRequestID string

	unimplementedNotificationEvent
}

type ChairNotificationEventUserPayload struct {
	ID   string
	Name string
}

type UserNotificationEventDispatching struct {
	ServerRequestID string

	unimplementedNotificationEvent
}

type UserNotificationEventDispatched struct {
	ServerRequestID string

	unimplementedNotificationEvent
}

type UserNotificationEventCarrying struct {
	ServerRequestID string

	unimplementedNotificationEvent
}

type UserNotificationEventArrived struct {
	ServerRequestID string

	unimplementedNotificationEvent
}

type UserNotificationEventCompleted struct {
	ServerRequestID string

	unimplementedNotificationEvent
}
