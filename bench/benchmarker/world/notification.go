package world

type NotificationEvent interface {
	isNotificationEvent()
}

type unimplementedNotificationEvent struct{}

func (*unimplementedNotificationEvent) isNotificationEvent() {}

type ChairNotificationEventMatched struct {
	ServerRequestID string

	unimplementedNotificationEvent
}

type ChairNotificationEventCompleted struct {
	ServerRequestID string

	unimplementedNotificationEvent
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

type UserNotificationEventCanceled struct {
	ServerRequestID string

	unimplementedNotificationEvent
}
