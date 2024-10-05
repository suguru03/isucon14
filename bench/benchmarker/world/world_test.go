package world

import (
	"fmt"
	"testing"
	"time"

	"github.com/brianvoe/gofakeit/v7"
	"github.com/isucon/isucon14/bench/internal/concurrent"
	"github.com/oklog/ulid/v2"
)

type requestEntry struct {
	ServerID     string
	ServerUserID string
	QueuedTime   time.Time
}

type FastServerStub struct {
	t                            *testing.T
	world                        *World
	latency                      time.Duration
	matchingTimeout              time.Duration
	requestQueue                 chan *requestEntry
	deniedRequests               *concurrent.SimpleMap[string, *concurrent.SimpleSet[string]]
	userNotificationReceiverMap  *concurrent.SimpleMap[string, NotificationReceiverFunc]
	chairNotificationReceiverMap *concurrent.SimpleMap[string, NotificationReceiverFunc]
}

func (s *FastServerStub) SendChairCoordinate(ctx *Context, chair *Chair) error {
	time.Sleep(s.latency)
	req := chair.Request
	if req != nil && req.DesiredStatus != req.UserStatus {
		if f, ok := s.userNotificationReceiverMap.Get(req.User.ServerID); ok {
			switch req.DesiredStatus {
			case RequestStatusDispatched:
				go f(&UserNotificationEventDispatched{})
			case RequestStatusArrived:
				go f(&UserNotificationEventArrived{})
			}
		}
	}
	return nil
}

func (s *FastServerStub) SendAcceptRequest(ctx *Context, chair *Chair, req *Request) error {
	time.Sleep(s.latency)
	if req.DesiredStatus == RequestStatusCanceled {
		return fmt.Errorf("request has been already canceled")
	}
	if req.DesiredStatus != RequestStatusMatching {
		return fmt.Errorf("expected request status %v, got %v", RequestStatusMatching, req.DesiredStatus)
	}
	if f, ok := s.userNotificationReceiverMap.Get(req.User.ServerID); ok {
		go f(&UserNotificationEventDispatching{})
	}
	return nil
}

func (s *FastServerStub) SendDenyRequest(ctx *Context, chair *Chair, serverRequestID string) error {
	time.Sleep(s.latency)
	list := s.deniedRequests.GetOrSetDefault(serverRequestID, concurrent.NewSimpleSet[string])
	list.Add(chair.ServerID)
	return nil
}

func (s *FastServerStub) SendDepart(ctx *Context, req *Request) error {
	time.Sleep(s.latency)
	if f, ok := s.userNotificationReceiverMap.Get(req.User.ServerID); ok {
		go f(&UserNotificationEventCarrying{})
	}
	return nil
}

func (s *FastServerStub) SendEvaluation(ctx *Context, req *Request) error {
	time.Sleep(s.latency)
	if f, ok := s.chairNotificationReceiverMap.Get(req.Chair.ServerID); ok {
		go f(&ChairNotificationEventCompleted{})
	}
	return nil
}

func (s *FastServerStub) SendCreateRequest(ctx *Context, req *Request) (*SendCreateRequestResponse, error) {
	time.Sleep(s.latency)
	id := ulid.Make().String()
	s.requestQueue <- &requestEntry{ServerID: id, ServerUserID: req.User.ServerID, QueuedTime: time.Now()}
	return &SendCreateRequestResponse{ServerRequestID: id}, nil
}

func (s *FastServerStub) SendActivate(ctx *Context, chair *Chair) error {
	time.Sleep(s.latency)
	return nil
}

func (s *FastServerStub) SendDeactivate(ctx *Context, chair *Chair) error {
	time.Sleep(s.latency)
	return nil
}

func (s *FastServerStub) GetRequestByChair(ctx *Context, chair *Chair, serverRequestID string) (*GetRequestByChairResponse, error) {
	time.Sleep(s.latency)
	return &GetRequestByChairResponse{}, nil
}

func (s *FastServerStub) RegisterUser(ctx *Context, data *RegisterUserRequest) (*RegisterUserResponse, error) {
	time.Sleep(s.latency)
	return &RegisterUserResponse{AccessToken: gofakeit.LetterN(30), ServerUserID: ulid.Make().String()}, nil
}

func (s *FastServerStub) RegisterChair(ctx *Context, data *RegisterChairRequest) (*RegisterChairResponse, error) {
	time.Sleep(s.latency)
	return &RegisterChairResponse{AccessToken: gofakeit.LetterN(30), ServerUserID: ulid.Make().String()}, nil
}

type notificationConnectionImpl struct {
	close func()
}

func (c *notificationConnectionImpl) Close() {
	c.close()
}

func (s *FastServerStub) ConnectUserNotificationStream(ctx *Context, user *User, receiver NotificationReceiverFunc) (NotificationStream, error) {
	time.Sleep(s.latency)
	s.userNotificationReceiverMap.Set(user.ServerID, receiver)
	return &notificationConnectionImpl{close: func() { s.userNotificationReceiverMap.Delete(user.ServerID) }}, nil
}

func (s *FastServerStub) ConnectChairNotificationStream(ctx *Context, chair *Chair, receiver NotificationReceiverFunc) (NotificationStream, error) {
	time.Sleep(s.latency)
	s.chairNotificationReceiverMap.Set(chair.ServerID, receiver)
	return &notificationConnectionImpl{close: func() { s.chairNotificationReceiverMap.Delete(chair.ServerID) }}, nil
}

func (s *FastServerStub) MatchingLoop() {
	for entry := range s.requestQueue {
		matched := false
		denied := s.deniedRequests.GetOrSetDefault(entry.ServerID, concurrent.NewSimpleSet[string])
		for _, chair := range s.world.ChairDB.Iter() {
			if chair.State == ChairStateActive && !chair.ServerRequestID.Valid && !denied.Has(chair.ServerID) {
				if f, ok := s.chairNotificationReceiverMap.Get(chair.ServerID); ok {
					f(&ChairNotificationEventMatched{ServerRequestID: entry.ServerID})
				}
				matched = true
				break
			}
		}
		if !matched {
			if time.Now().Sub(entry.QueuedTime) > s.matchingTimeout {
				// キャンセル
				if f, ok := s.userNotificationReceiverMap.Get(entry.ServerUserID); ok {
					f(&UserNotificationEventCanceled{})
				}
			} else {
				s.requestQueue <- entry
			}
		}
	}
}

func TestWorld(t *testing.T) {
	var (
		completedRequestChan = make(chan *Request, 1000)
		world                = NewWorld(1500*time.Microsecond, completedRequestChan)
		client               = &FastServerStub{
			t:                            t,
			world:                        world,
			latency:                      1 * time.Millisecond,
			matchingTimeout:              200 * time.Millisecond,
			requestQueue:                 make(chan *requestEntry, 1000),
			deniedRequests:               concurrent.NewSimpleMap[string, *concurrent.SimpleSet[string]](),
			userNotificationReceiverMap:  concurrent.NewSimpleMap[string, NotificationReceiverFunc](),
			chairNotificationReceiverMap: concurrent.NewSimpleMap[string, NotificationReceiverFunc](),
		}
		ctx = &Context{
			world:  world,
			client: client,
		}
		region = world.Regions[1]
	)

	// MEMO: chan が詰まらないように
	go func() {
		for req := range completedRequestChan {
			t.Log(req)
		}
	}()

	for range 10 {
		_, err := world.CreateChair(ctx, &CreateChairArgs{
			Region:            region,
			InitialCoordinate: RandomCoordinateOnRegion(region),
			WorkTime:          NewInterval(ConvertHour(0), ConvertHour(23)),
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	for range 20 {
		u, err := world.CreateUser(ctx, &CreateUserArgs{Region: region})
		if err != nil {
			t.Fatal(err)
		}
		u.State = UserStateActive
	}

	go client.MatchingLoop()

	for range ConvertHour(24 * 3) {
		world.Tick(ctx)
	}

	for _, user := range world.UserDB.Iter() {
		t.Log(user)
	}
	sales := 0
	for _, req := range world.RequestDB.Iter() {
		t.Log(req)
		if req.DesiredStatus == RequestStatusCompleted {
			sales += req.Fare()
		}
	}
	t.Logf("sales: %d", sales)
}
