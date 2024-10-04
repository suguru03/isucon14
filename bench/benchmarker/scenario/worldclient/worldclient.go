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
	ctx                          context.Context
	webappClientConfig           webapp.ClientConfig
	world                        *world.World
	chairNotificationReceiverMap *concurrent.SimpleMap[string, world.NotificationReceiverFunc]
	chairClients                 map[string]*chairClient
	userClients                  map[string]*userClient
}

func NewWorldClient(ctx context.Context, w *world.World, webappClientConfig webapp.ClientConfig, chairNotificationReceiverMap *concurrent.SimpleMap[string, world.NotificationReceiverFunc]) *WorldClient {
	return &WorldClient{
		ctx:                          ctx,
		world:                        w,
		webappClientConfig:           webappClientConfig,
		chairNotificationReceiverMap: chairNotificationReceiverMap,
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

	req := chair.Request
	if req != nil && req.DesiredStatus != req.UserStatus {
		err := c.world.UpdateRequestUserStatus(req.User.ID, req.DesiredStatus)
		if err != nil {
			return err
		}
	}

	return nil
}

func (c *WorldClient) SendAcceptRequest(ctx *world.Context, req *world.Request) error {
	chairClient, err := c.getChairClient(req.Chair.ServerID)
	if err != nil {
		return err
	}
	// TODO: Lat, Lng と X, Y の対応
	_, err = chairClient.client.PostAccept(chairClient.ctx, req.ServerID)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostAccept, err)
	}

	err = c.world.UpdateRequestUserStatus(req.User.ID, world.RequestStatusDispatching)
	if err != nil {
		return err
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

	err = c.world.UpdateRequestUserStatus(req.User.ID, world.RequestStatusCarrying)
	if err != nil {
		return err
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

	if f, ok := c.chairNotificationReceiverMap.Get(req.Chair.ServerID); ok {
		// TODO: eventData どうする？
		go f(world.ChairNotificationEventCompleted, "")
	}
	return nil
}

func (c *WorldClient) SendCreateRequest(ctx *world.Context, req *world.Request) (*world.SendCreateRequestResponse, error) {
	// TODO: queue
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

func (c *WorldClient) ConnectChairNotificationStream(ctx *world.Context, chair *world.Chair, receiver world.NotificationReceiverFunc) (world.NotificationStream, error) {
	c.chairNotificationReceiverMap.Set(chair.ServerID, receiver)
	return &notificationConnectionImpl{
		close: func() {
			c.chairNotificationReceiverMap.Delete(chair.ServerID)
		},
	}, nil
}
