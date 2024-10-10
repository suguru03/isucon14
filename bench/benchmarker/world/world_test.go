package world

import (
	"fmt"
	"iter"
	"sync"
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

type eventEntry struct {
	handler   NotificationReceiverFunc
	event     NotificationEvent
	afterFunc func()
}

type chairState struct {
	ServerID        string
	Active          bool
	AssignedRequest *requestEntry
	sync.RWMutex
}

type FastServerStub struct {
	t                            *testing.T
	chairDB                      *concurrent.SimpleMap[string, *chairState]
	latency                      time.Duration
	matchingTimeout              time.Duration
	requestQueue                 chan *requestEntry
	deniedRequests               *concurrent.SimpleMap[string, *concurrent.SimpleSet[string]]
	userNotificationReceiverMap  *concurrent.SimpleMap[string, NotificationReceiverFunc]
	chairNotificationReceiverMap *concurrent.SimpleMap[string, NotificationReceiverFunc]
	eventQueue                   chan *eventEntry
}

func (s *FastServerStub) SendChairCoordinate(ctx *Context, chair *Chair) error {
	time.Sleep(s.latency)
	req := chair.Request
	if req != nil {
		if req.Statuses.Desired != req.Statuses.User {
			if f, ok := s.userNotificationReceiverMap.Get(req.User.ServerID); ok {
				switch req.Statuses.Desired {
				case RequestStatusDispatched:
					s.eventQueue <- &eventEntry{handler: f, event: &UserNotificationEventDispatched{}}
				case RequestStatusArrived:
					s.eventQueue <- &eventEntry{handler: f, event: &UserNotificationEventArrived{}}
				}
			}
		}
	}
	return nil
}

func (s *FastServerStub) SendAcceptRequest(ctx *Context, chair *Chair, req *Request) error {
	time.Sleep(s.latency)
	if req.Statuses.Desired == RequestStatusCanceled {
		return fmt.Errorf("request has been already canceled")
	}
	if req.Statuses.Desired != RequestStatusMatching {
		return fmt.Errorf("expected request status %v, got %v", RequestStatusMatching, req.Statuses.Desired)
	}
	if f, ok := s.userNotificationReceiverMap.Get(req.User.ServerID); ok {
		s.eventQueue <- &eventEntry{handler: f, event: &UserNotificationEventDispatching{}}
	}
	return nil
}

func (s *FastServerStub) SendDenyRequest(ctx *Context, chair *Chair, serverRequestID string) error {
	time.Sleep(s.latency)
	list, _ := s.deniedRequests.GetOrSetDefault(serverRequestID, concurrent.NewSimpleSet[string])
	list.Add(chair.ServerID)
	c, ok := s.chairDB.Get(chair.ServerID)
	if !ok {
		return fmt.Errorf("chair not found")
	}
	c.Lock()
	s.requestQueue <- c.AssignedRequest
	c.AssignedRequest = nil
	c.Unlock()
	return nil
}

func (s *FastServerStub) SendDepart(ctx *Context, req *Request) error {
	time.Sleep(s.latency)
	if f, ok := s.userNotificationReceiverMap.Get(req.User.ServerID); ok {
		s.eventQueue <- &eventEntry{handler: f, event: &UserNotificationEventCarrying{}}
	}
	return nil
}

func (s *FastServerStub) SendEvaluation(ctx *Context, req *Request) error {
	time.Sleep(s.latency)
	c, ok := s.chairDB.Get(req.Chair.ServerID)
	if !ok {
		return fmt.Errorf("chair not found")
	}
	if f, ok := s.userNotificationReceiverMap.Get(req.User.ServerID); ok {
		s.eventQueue <- &eventEntry{handler: f, event: &UserNotificationEventCompleted{}}
	}
	if f, ok := s.chairNotificationReceiverMap.Get(req.Chair.ServerID); ok {
		s.eventQueue <- &eventEntry{handler: f, event: &ChairNotificationEventCompleted{ServerRequestID: req.ServerID}, afterFunc: func() {
			c.Lock()
			c.AssignedRequest = nil
			c.Unlock()
		}}
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
	c, ok := s.chairDB.Get(chair.ServerID)
	if !ok {
		return fmt.Errorf("chair does not exist")
	}
	c.Lock()
	c.Active = true
	c.Unlock()
	return nil
}

func (s *FastServerStub) SendDeactivate(ctx *Context, chair *Chair) error {
	time.Sleep(s.latency)
	c, ok := s.chairDB.Get(chair.ServerID)
	if !ok {
		return fmt.Errorf("chair does not exist")
	}
	c.Lock()
	c.Active = false
	c.Unlock()
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

func (s *FastServerStub) RegisterProvider(ctx *Context, data *RegisterProviderRequest) (*RegisterProviderResponse, error) {
	time.Sleep(s.latency)
	return &RegisterProviderResponse{AccessToken: gofakeit.LetterN(30), ServerProviderID: ulid.Make().String()}, nil
}

func (s *FastServerStub) RegisterChair(ctx *Context, provider *Provider, data *RegisterChairRequest) (*RegisterChairResponse, error) {
	time.Sleep(s.latency)
	c := &chairState{ServerID: ulid.Make().String(), Active: false}
	s.chairDB.Set(c.ServerID, c)
	return &RegisterChairResponse{AccessToken: gofakeit.LetterN(30), ServerUserID: c.ServerID}, nil
}

func (s *FastServerStub) RegisterPaymentMethods(ctx *Context, user *User) error {
	time.Sleep(s.latency)
	return nil
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
		denied, _ := s.deniedRequests.GetOrSetDefault(entry.ServerID, concurrent.NewSimpleSet[string])
		for _, chair := range s.chairDB.Iter() {
			chair.Lock()
			if chair.Active && chair.AssignedRequest == nil && !denied.Has(chair.ServerID) {
				chair.AssignedRequest = entry
				chair.Unlock()
				if f, ok := s.chairNotificationReceiverMap.Get(chair.ServerID); ok {
					s.eventQueue <- &eventEntry{handler: f, event: &ChairNotificationEventMatched{ServerRequestID: entry.ServerID}}
				}
				matched = true
				break
			}
			chair.Unlock()
		}
		if !matched {
			if time.Since(entry.QueuedTime) > s.matchingTimeout {
				// キャンセル
				if f, ok := s.userNotificationReceiverMap.Get(entry.ServerUserID); ok {
					s.eventQueue <- &eventEntry{handler: f, event: &UserNotificationEventCanceled{}}
				}
			} else {
				s.requestQueue <- entry
			}
		}
	}
}

func (s *FastServerStub) SendEventLoop() {
	for entry := range s.eventQueue {
		entry.handler(entry.event)
		if entry.afterFunc != nil {
			entry.afterFunc()
		}
		time.Sleep(s.latency)
	}
}

func TestWorld(t *testing.T) {
	var (
		completedRequestChan = make(chan *Request, 1000)
		world                = NewWorld(30*time.Millisecond, completedRequestChan)
		client               = &FastServerStub{
			t:                            t,
			chairDB:                      concurrent.NewSimpleMap[string, *chairState](),
			latency:                      1 * time.Millisecond,
			matchingTimeout:              200 * time.Millisecond,
			requestQueue:                 make(chan *requestEntry, 1000),
			deniedRequests:               concurrent.NewSimpleMap[string, *concurrent.SimpleSet[string]](),
			userNotificationReceiverMap:  concurrent.NewSimpleMap[string, NotificationReceiverFunc](),
			chairNotificationReceiverMap: concurrent.NewSimpleMap[string, NotificationReceiverFunc](),
			eventQueue:                   make(chan *eventEntry, 1000),
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

	for range 5 {
		_, err := world.CreateProvider(ctx, &CreateProviderArgs{})
		if err != nil {
			t.Fatal(err)
		}
	}
	next, _ := iter.Pull2(world.ProviderDB.Iter())
	for range 10 {
		_, provider, ok := next()
		if !ok {
			next, _ = iter.Pull2(world.ProviderDB.Iter())
		}
		_, err := world.CreateChair(ctx, &CreateChairArgs{
			Provider: provider,
			Region:            region,
			InitialCoordinate: RandomCoordinateOnRegion(region),
			WorkTime:          NewInterval(ConvertHour(0), ConvertHour(24)),
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	for range 20 {
		_, err := world.CreateUser(ctx, &CreateUserArgs{Region: region})
		if err != nil {
			t.Fatal(err)
		}
	}

	go client.MatchingLoop()
	go client.SendEventLoop()

	for range ConvertHour(1) {
		if err := world.Tick(ctx); err != nil {
			t.Fatal(err)
		}
	}

	for _, user := range world.UserDB.Iter() {
		t.Log(user)
	}
	sales := 0
	for _, req := range world.RequestDB.Iter() {
		t.Log(req)
		if req.Statuses.Desired == RequestStatusCompleted {
			sales += req.Fare()
		}
	}
	t.Logf("sales: %d", sales)
}
