package worldclient

import (
	"context"

	"github.com/isucon/isucon14/bench/benchmarker/webapp"
	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
	"github.com/isucon/isucon14/bench/benchmarker/world"
	"github.com/isucon/isucon14/bench/internal/concurrent"
)

type chairClient struct {
	ctx    context.Context // 現状 WorldClient の ctx と同じ
	client *webapp.Client
}

type userClient struct {
	ctx    context.Context // 現状 WorldClient の ctx と同じ
	client *webapp.Client
}

type WorldClient struct {
	ctx                context.Context
	webappClientConfig webapp.ClientConfig
	world              *world.World
	// TODO webapp側から通知してもらうようにする
	userNotificationReceiverMap *concurrent.SimpleMap[string, world.NotificationReceiverFunc]
	// TODO webapp側から通知してもらうようにする
	chairNotificationReceiverMap *concurrent.SimpleMap[string, world.NotificationReceiverFunc]
	requestQueue                 chan string
	chairClients                 map[string]*chairClient
	userClients                  map[string]*userClient
}

func NewWorldClient(ctx context.Context, w *world.World, webappClientConfig webapp.ClientConfig, userNotificationReceiverMap *concurrent.SimpleMap[string, world.NotificationReceiverFunc], chairNotificationReceiverMap *concurrent.SimpleMap[string, world.NotificationReceiverFunc], requestQueue chan string) *WorldClient {
	return &WorldClient{
		ctx:                          ctx,
		world:                        w,
		webappClientConfig:           webappClientConfig,
		userNotificationReceiverMap:  userNotificationReceiverMap,
		chairNotificationReceiverMap: chairNotificationReceiverMap,
		requestQueue:                 requestQueue,
		chairClients:                 map[string]*chairClient{},
		userClients:                  map[string]*userClient{},
	}
}

func (c *WorldClient) getChairClient(chairServerID string) (*chairClient, error) {
	chairClient, ok := c.chairClients[chairServerID]
	if !ok {
		return nil, CodeError(ErrorCodeNotFoundChairClient)
	}
	return chairClient, nil
}

func (c *WorldClient) getUserClient(userServerID string) (*userClient, error) {
	userClient, ok := c.userClients[userServerID]
	if !ok {
		return nil, CodeError(ErrorCodeNotFoundUserClient)
	}
	return userClient, nil
}

func (c *WorldClient) SendChairCoordinate(ctx *world.Context, chair *world.Chair) error {
	chairClient, err := c.getChairClient(chair.ServerID)
	if err != nil {
		return err
	}
	// TODO: Lat, Lng と X, Y の対応
	_, err = chairClient.client.PostCoordinate(chairClient.ctx, &api.Coordinate{
		Latitude:  float64(chair.Current.X),
		Longitude: float64(chair.Current.Y),
	})
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostCoordinate, err)
	}

	// TODO: webapp側から通知してもらうようにする
	req := chair.Request
	if req != nil && req.DesiredStatus != req.UserStatus {
		if f, ok := c.userNotificationReceiverMap.Get(req.User.ServerID); ok {
			switch req.DesiredStatus {
			case world.RequestStatusDispatched:
				go f(&world.UserNotificationEventDispatched{})
			case world.RequestStatusArrived:
				go f(&world.UserNotificationEventArrived{})
			}
		}
	}
	return nil
}

func (c *WorldClient) SendAcceptRequest(ctx *world.Context, chair *world.Chair, req *world.Request) error {
	chairClient, err := c.getChairClient(chair.ServerID)
	if err != nil {
		return err
	}
	// TODO: Lat, Lng と X, Y の対応
	_, err = chairClient.client.PostAccept(chairClient.ctx, req.ServerID)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostAccept, err)
	}

	// TODO: webapp側から通知してもらうようにする
	if f, ok := c.userNotificationReceiverMap.Get(req.User.ServerID); ok {
		go f(&world.UserNotificationEventDispatching{})
	}
	return nil
}

func (c *WorldClient) SendDenyRequest(ctx *world.Context, chair *world.Chair, serverRequestID string) error {
	chairClient, err := c.getChairClient(chair.ServerID)
	if err != nil {
		return err
	}

	_, err = chairClient.client.PostDeny(chairClient.ctx, serverRequestID)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostDeny, err)
	}

	return nil
}

func (c *WorldClient) SendDepart(ctx *world.Context, req *world.Request) error {
	chairClient, err := c.getChairClient(req.Chair.ServerID)
	if err != nil {
		return err
	}

	_, err = chairClient.client.PostDepart(chairClient.ctx, req.ServerID)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostDepart, err)
	}

	// TODO webapp側から通知してもらうようにする
	if f, ok := c.userNotificationReceiverMap.Get(req.User.ServerID); ok {
		go f(&world.UserNotificationEventCarrying{})
	}
	return nil
}

func (c *WorldClient) SendEvaluation(ctx *world.Context, req *world.Request) error {
	userClient, err := c.getUserClient(req.User.ServerID)
	if err != nil {
		return err
	}

	// TODO: 評価点どうする？
	_, err = userClient.client.PostEvaluate(userClient.ctx, req.ServerID, &api.EvaluateReq{
		Evaluation: 5,
	})
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostEvaluate, err)
	}

	// TODO webapp側から通知してもらうようにする
	if f, ok := c.chairNotificationReceiverMap.Get(req.Chair.ServerID); ok {
		go f(&world.ChairNotificationEventCompleted{})
	}
	return nil
}

func (c *WorldClient) SendCreateRequest(ctx *world.Context, req *world.Request) (*world.SendCreateRequestResponse, error) {
	userClient, err := c.getUserClient(req.User.ServerID)
	if err != nil {
		return nil, err
	}

	pickup := req.PickupPoint
	destination := req.DestinationPoint
	response, err := userClient.client.PostRequest(userClient.ctx, &api.PostRequestReq{
		PickupCoordinate: api.Coordinate{
			Latitude:  float64(pickup.X),
			Longitude: float64(pickup.Y),
		},
		DestinationCoordinate: api.Coordinate{
			Latitude:  float64(destination.X),
			Longitude: float64(destination.Y),
		},
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToPostRequest, err)
	}

	// TODO webapp側から通知してもらうようにする
	c.requestQueue <- response.RequestID

	return &world.SendCreateRequestResponse{ServerRequestID: response.RequestID}, nil
}

func (c *WorldClient) SendActivate(ctx *world.Context, chair *world.Chair) error {
	chairClient, err := c.getChairClient(chair.ServerID)
	if err != nil {
		return err
	}

	_, err = chairClient.client.PostActivate(chairClient.ctx)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostActivate, err)
	}

	return nil
}

func (c *WorldClient) SendDeactivate(ctx *world.Context, chair *world.Chair) error {
	chairClient, err := c.getChairClient(chair.ServerID)
	if err != nil {
		return err
	}

	_, err = chairClient.client.PostDeactivate(chairClient.ctx)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostDeactivate, err)
	}

	return nil
}

func (c *WorldClient) GetRequestByChair(ctx *world.Context, chair *world.Chair, serverRequestID string) (*world.GetRequestByChairResponse, error) {
	chairClient, err := c.getChairClient(chair.ServerID)
	if err != nil {
		return nil, err
	}

	_, err = chairClient.client.GetDriverRequest(chairClient.ctx, serverRequestID)
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToGetDriverRequest, err)
	}

	// TODO: GetRequestByChairResponse の中身入れる
	return &world.GetRequestByChairResponse{}, nil
}

func (c *WorldClient) RegisterUser(ctx *world.Context, data *world.RegisterUserRequest) (*world.RegisterUserResponse, error) {
	client, err := webapp.NewClient(c.webappClientConfig)
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToCreateWebappClient, err)
	}

	response, err := client.Register(c.ctx, &api.RegisterUserReq{
		Username:    data.UserName,
		Firstname:   data.FirstName,
		Lastname:    data.LastName,
		DateOfBirth: data.DateOfBirth,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToRegisterUser, err)
	}

	c.userClients[response.ID] = &userClient{
		ctx:    c.ctx,
		client: client,
	}

	return &world.RegisterUserResponse{
		ServerUserID: response.ID,
		AccessToken:  response.AccessToken,
	}, nil
}

func (c *WorldClient) RegisterChair(ctx *world.Context, data *world.RegisterChairRequest) (*world.RegisterChairResponse, error) {
	client, err := webapp.NewClient(c.webappClientConfig)
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToCreateWebappClient, err)
	}

	response, err := client.RegisterDriver(c.ctx, &api.RegisterDriverReq{
		Username:    data.UserName,
		Firstname:   data.FirstName,
		Lastname:    data.LastName,
		DateOfBirth: data.DateOfBirth,
		CarModel:    data.ChairModel,
		CarNo:       data.ChairNo,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToRegisterDriver, err)
	}

	c.chairClients[response.ID] = &chairClient{
		ctx:    c.ctx,
		client: client,
	}

	return &world.RegisterChairResponse{
		ServerUserID: response.ID,
		AccessToken:  response.AccessToken,
	}, nil
}

type notificationConnectionImpl struct {
	close func()
}

func (c *notificationConnectionImpl) Close() {
	c.close()
}

func (c *WorldClient) ConnectUserNotificationStream(ctx *world.Context, user *world.User, receiver world.NotificationReceiverFunc) (world.NotificationStream, error) {
	// TODO SSEに接続してwebapp側から通知してもらうようにする
	c.userNotificationReceiverMap.Set(user.ServerID, receiver)
	return &notificationConnectionImpl{
		close: func() {
			c.userNotificationReceiverMap.Delete(user.ServerID)
		},
	}, nil
}

func (c *WorldClient) ConnectChairNotificationStream(ctx *world.Context, chair *world.Chair, receiver world.NotificationReceiverFunc) (world.NotificationStream, error) {
	// TODO SSEに接続してwebapp側から通知してもらうようにする
	c.chairNotificationReceiverMap.Set(chair.ServerID, receiver)
	return &notificationConnectionImpl{
		close: func() {
			c.chairNotificationReceiverMap.Delete(chair.ServerID)
		},
	}, nil
}
