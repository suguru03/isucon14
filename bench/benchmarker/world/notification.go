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
	unimplementedNotificationEvent
}

type UserNotificationEventDispatched struct {
	unimplementedNotificationEvent
}

type UserNotificationEventCarrying struct {
	unimplementedNotificationEvent
}

type UserNotificationEventArrived struct {
	unimplementedNotificationEvent
}

type UserNotificationEventCanceled struct {
	unimplementedNotificationEvent
}
