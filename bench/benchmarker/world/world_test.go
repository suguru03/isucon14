package world

import (
	"fmt"
	"math/rand/v2"
	"testing"
	"time"

	"github.com/brianvoe/gofakeit/v7"
	"github.com/isucon/isucon14/bench/internal/concurrent"
	"github.com/isucon/isucon14/bench/internal/random"
	"github.com/oklog/ulid/v2"
)

type FastServerStub struct {
	t                            *testing.T
	world                        *World
	latency                      time.Duration
	requestQueue                 chan string
	chairNotificationReceiverMap *concurrent.SimpleMap[string, NotificationReceiverFunc]
}

func (s *FastServerStub) SendChairCoordinate(ctx *Context, chair *Chair) error {
	time.Sleep(s.latency)
	go func() {
		req := chair.Request
		if req != nil && req.DesiredStatus != req.UserStatus {
			err := s.world.UpdateRequestUserStatus(req.User.ID, req.DesiredStatus)
			if err != nil {
				panic(err)
			}
		}
	}()
	return nil
}

func (s *FastServerStub) SendAcceptRequest(ctx *Context, req *Request) error {
	time.Sleep(s.latency)
	go func() {
		err := s.world.UpdateRequestUserStatus(req.User.ID, RequestStatusDispatching)
		if err != nil {
			panic(err)
		}
	}()
	return nil
}

func (s *FastServerStub) SendDenyRequest(ctx *Context, chair *Chair, serverRequestID string) error {
	time.Sleep(s.latency)
	return nil
}

func (s *FastServerStub) SendDepart(ctx *Context, req *Request) error {
	time.Sleep(s.latency)
	go func() {
		err := s.world.UpdateRequestUserStatus(req.User.ID, RequestStatusCarrying)
		if err != nil {
			panic(err)
		}
	}()
	return nil
}

func (s *FastServerStub) SendEvaluation(ctx *Context, req *Request) error {
	time.Sleep(s.latency)
	if f, ok := s.chairNotificationReceiverMap.Get(req.Chair.ServerID); ok {
		go f(ChairNotificationEventCompleted, "")
	}
	return nil
}

func (s *FastServerStub) SendCreateRequest(ctx *Context, req *Request) (*SendCreateRequestResponse, error) {
	time.Sleep(s.latency)
	id := ulid.Make().String()
	s.requestQueue <- id
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

func (s *FastServerStub) ConnectChairNotificationStream(ctx *Context, chair *Chair, receiver NotificationReceiverFunc) (NotificationStream, error) {
	time.Sleep(s.latency)
	s.chairNotificationReceiverMap.Set(chair.ServerID, receiver)
	return &notificationConnectionImpl{close: func() { s.chairNotificationReceiverMap.Delete(chair.ServerID) }}, nil
}

func (s *FastServerStub) MatchingLoop() {
	for id := range s.requestQueue {
		matched := false
		for _, chair := range s.world.ChairDB.Iter() {
			if chair.State == ChairStateActive && !chair.ServerRequestID.Valid {
				if f, ok := s.chairNotificationReceiverMap.Get(chair.ServerID); ok {
					f(ChairNotificationEventMatched, fmt.Sprintf(`{"id":"%s"}`, id))
				}
				matched = true
				break
			}
		}
		if !matched {
			s.requestQueue <- id
		}
	}
}

func TestWorld(t *testing.T) {
	var (
		region = &Region{
			RegionWidth:   1000,
			RegionHeight:  1000,
			RegionOffsetX: 0,
			RegionOffsetY: 0,
		}
		world = &World{
			Regions:   map[int]*Region{1: region},
			UserDB:    NewGenericDB[UserID, *User](),
			ChairDB:   NewGenericDB[ChairID, *Chair](),
			RequestDB: NewRequestDB(),
		}
		client = &FastServerStub{
			t:                            t,
			world:                        world,
			latency:                      1 * time.Millisecond,
			requestQueue:                 make(chan string, 1000),
			chairNotificationReceiverMap: concurrent.NewSimpleMap[string, NotificationReceiverFunc](),
		}
		ctx = &Context{
			rand:   rand.New(random.NewLockedSource(rand.NewPCG(rand.Uint64(), rand.Uint64()))),
			world:  world,
			client: client,
		}
	)

	for range 10 {
		_, err := world.CreateChair(ctx, &CreateChairArgs{
			Region:            region,
			InitialCoordinate: RandomCoordinateOnRegion(region),
			WorkTime:          NewInterval(convertHour(0), convertHour(23)),
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

	for range convertHour(24 * 3) {
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
