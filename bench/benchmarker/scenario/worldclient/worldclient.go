package worldclient

import (
	"context"

	"go.uber.org/zap"

	"github.com/isucon/isucon14/bench/benchmarker/webapp"
	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
	"github.com/isucon/isucon14/bench/benchmarker/world"
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
	requestQueue       chan string
	contestantLogger   *zap.Logger
	chairClients       map[string]*chairClient
	userClients        map[string]*userClient
}

func NewWorldClient(ctx context.Context, w *world.World, webappClientConfig webapp.ClientConfig, requestQueue chan string, contestantLogger *zap.Logger) *WorldClient {
	return &WorldClient{
		ctx:                ctx,
		world:              w,
		webappClientConfig: webappClientConfig,
		requestQueue:       requestQueue,
		contestantLogger:   contestantLogger,
		chairClients:       map[string]*chairClient{},
		userClients:        map[string]*userClient{},
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
	_, err = chairClient.client.ChairPostCoordinate(chairClient.ctx, &api.Coordinate{
		Latitude:  chair.Current.X,
		Longitude: chair.Current.Y,
	})
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostCoordinate, err)
	}

	return nil
}

func (c *WorldClient) SendAcceptRequest(ctx *world.Context, chair *world.Chair, req *world.Request) error {
	chairClient, err := c.getChairClient(chair.ServerID)
	if err != nil {
		return err
	}
	_, err = chairClient.client.ChairPostRequestAccept(chairClient.ctx, req.ServerID)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostAccept, err)
	}

	return nil
}

func (c *WorldClient) SendDenyRequest(ctx *world.Context, chair *world.Chair, serverRequestID string) error {
	chairClient, err := c.getChairClient(chair.ServerID)
	if err != nil {
		return err
	}

	_, err = chairClient.client.ChairPostRequestDeny(chairClient.ctx, serverRequestID)
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

	_, err = chairClient.client.ChairPostRequestDepart(chairClient.ctx, req.ServerID)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostDepart, err)
	}

	return nil
}

func (c *WorldClient) SendEvaluation(ctx *world.Context, req *world.Request) error {
	userClient, err := c.getUserClient(req.User.ServerID)
	if err != nil {
		return err
	}

	// TODO: 評価点どうする？
	_, err = userClient.client.AppPostRequestEvaluate(userClient.ctx, req.ServerID, &api.AppPostRequestEvaluateReq{
		Evaluation: 5,
	})
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostEvaluate, err)
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
	response, err := userClient.client.AppPostRequest(userClient.ctx, &api.AppPostRequestReq{
		PickupCoordinate: api.Coordinate{
			Latitude:  pickup.X,
			Longitude: pickup.Y,
		},
		DestinationCoordinate: api.Coordinate{
			Latitude:  destination.X,
			Longitude: destination.Y,
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

	_, err = chairClient.client.ChairPostActivate(chairClient.ctx)
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

	_, err = chairClient.client.ChairPostDeactivate(chairClient.ctx)
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

	_, err = chairClient.client.ChairGetRequest(chairClient.ctx, serverRequestID)
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

	response, err := client.AppPostRegister(c.ctx, &api.AppPostRegisterReq{
		Username:    data.UserName,
		Firstname:   data.FirstName,
		Lastname:    data.LastName,
		DateOfBirth: data.DateOfBirth,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToRegisterUser, err)
	}

	newCtx, _ := context.WithCancel(c.ctx)
	c.userClients[response.ID] = &userClient{
		ctx:    newCtx,
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

	response, err := client.ChairPostRegister(c.ctx, &api.ChairPostRegisterReq{
		Username:    data.UserName,
		Firstname:   data.FirstName,
		Lastname:    data.LastName,
		DateOfBirth: data.DateOfBirth,
		ChairModel:  data.ChairModel,
		ChairNo:     data.ChairNo,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToRegisterDriver, err)
	}

	newCtx, _ := context.WithCancel(c.ctx)
	c.chairClients[response.ID] = &chairClient{
		ctx:    newCtx,
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
	go func() {
		userClient, err := c.getUserClient(user.ServerID)
		if err != nil {
			return
		}

		for {
			select {
			case <-userClient.ctx.Done():
				c.contestantLogger.Info("User notification stream closed", zap.String("user_id", user.ServerID))
				return
			default:
			}

			res, result, err := userClient.client.AppGetNotification(userClient.ctx)
			if err != nil {
				// TODO: 減点
				c.contestantLogger.Error("Failed to receive app notifications", zap.Error(err))
				continue
			}
			for receivedRequest := range res {
				var event world.NotificationEvent
				// TODO: 意図しない通知の種類の減点
				switch receivedRequest.Status {
				case api.RequestStatusMATCHING:
					// event = &world.UserNotificationEventMatching{}
				case api.RequestStatusDISPATCHING:
					event = &world.UserNotificationEventDispatching{}
				case api.RequestStatusDISPATCHED:
					event = &world.UserNotificationEventDispatched{}
				case api.RequestStatusCARRYING:
					event = &world.UserNotificationEventCarrying{}
				case api.RequestStatusARRIVED:
					event = &world.UserNotificationEventArrived{}
				case api.RequestStatusCOMPLETED:
					// event = &world.UserNotificationEventCompleted{}
				case api.RequestStatusCANCELED:
					// event = &world.UserNotificationEventCanceled{}
				}
				if event == nil {
					c.contestantLogger.Warn("Unexpected user notification", zap.Any("request", receivedRequest))
					continue
				}
				receiver(event)
			}

			if err := result(); err != nil {
				c.contestantLogger.Error("Failed to receive app notifications", zap.Error(err))
				continue
			}
		}
	}()

	return &notificationConnectionImpl{
		close: func() {
			userClient, err := c.getUserClient(user.ServerID)
			if err != nil {
				c.contestantLogger.Error("Failed to close user notification stream", zap.Error(err))
				return
			}
			userClient.ctx.Done()
		},
	}, nil
}

func (c *WorldClient) ConnectChairNotificationStream(ctx *world.Context, chair *world.Chair, receiver world.NotificationReceiverFunc) (world.NotificationStream, error) {
	go func() {
		chairClient, err := c.getChairClient(chair.ServerID)
		if err != nil {
			return
		}

		for {
			select {
			case <-c.ctx.Done():
				c.contestantLogger.Info("Chair notification stream closed", zap.String("chair_id", chair.ServerID))
				return
			default:
			}

			res, result, err := chairClient.client.ChairGetNotification(chairClient.ctx)
			if err != nil {
				c.contestantLogger.Error("Failed to receive chair notifications", zap.Error(err))
				return
			}
			for receivedRequest := range res {
				var event world.NotificationEvent
				// TODO: 意図しない通知の種類の減点
				switch receivedRequest.Status.Value {
				case api.RequestStatusMATCHING:
					event = &world.ChairNotificationEventMatched{
						ServerRequestID: receivedRequest.RequestID,
					}
				case api.RequestStatusDISPATCHING:
					// event = &world.ChairNotificationEventDispatching{}
				case api.RequestStatusDISPATCHED:
					// event = &world.ChairNotificationEventDispatched{}
				case api.RequestStatusCARRYING:
					// event = &world.ChairNotificationEventCarrying{}
				case api.RequestStatusARRIVED:
					// event = &world.ChairNotificationEventArrived{}
				case api.RequestStatusCOMPLETED:
					event = &world.ChairNotificationEventCompleted{}
				case api.RequestStatusCANCELED:
					// event = &world.ChairNotificationEventCanceled{}
				}
				if event == nil {
					c.contestantLogger.Warn("Unexpected chair notification", zap.Any("request", receivedRequest))
					continue
				}
				receiver(event)
			}

			if err := result(); err != nil {
				c.contestantLogger.Error("Failed to receive chair notifications", zap.Error(err))
				return
			}
		}
	}()

	return &notificationConnectionImpl{
		close: func() {
			chairClient, err := c.getChairClient(chair.ServerID)
			if err != nil {
				c.contestantLogger.Error("Failed to close chair notification stream", zap.Error(err))
				return
			}
			chairClient.ctx.Done()
		},
	}, nil
}
