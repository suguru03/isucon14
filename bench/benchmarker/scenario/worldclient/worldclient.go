package worldclient

import (
	"context"
	"net/http"

	"go.uber.org/zap"

	"github.com/isucon/isucon14/bench/benchmarker/webapp"
	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
	"github.com/isucon/isucon14/bench/benchmarker/world"
)

type userClient struct {
	sseContext context.Context
	client     *webapp.Client
}

type providerClient struct {
	sseContext context.Context
	client     *webapp.Client
}

type chairClient struct {
	sseContext context.Context
	client     *webapp.Client
}

type WorldClient struct {
	ctx                context.Context
	webappClientConfig webapp.ClientConfig
	world              *world.World
	requestQueue       chan string
	contestantLogger   *zap.Logger
	userClients        map[string]*userClient
	providerClients		map[string]*providerClient
	chairClients       map[string]*chairClient
}

func NewWorldClient(ctx context.Context, w *world.World, webappClientConfig webapp.ClientConfig, requestQueue chan string, contestantLogger *zap.Logger) *WorldClient {
	return &WorldClient{
		ctx:                ctx,
		world:              w,
		webappClientConfig: webappClientConfig,
		requestQueue:       requestQueue,
		contestantLogger:   contestantLogger,
		userClients:        map[string]*userClient{},
		providerClients:    map[string]*providerClient{},
		chairClients:       map[string]*chairClient{},
	}
}

func (c *WorldClient) getUserClient(userServerID string) (*userClient, error) {
	userClient, ok := c.userClients[userServerID]
	if !ok {
		return nil, CodeError(ErrorCodeNotFoundUserClient)
	}
	return userClient, nil
}

func (c *WorldClient) getProviderClient(providerServerID string) (*providerClient, error) {
	providerClient, ok := c.providerClients[providerServerID]
	if !ok {
		return nil, CodeError(ErrorCodeNotFoundProviderClient)
	}
	return providerClient, nil
}

func (c *WorldClient) getChairClient(chairServerID string) (*chairClient, error) {
	chairClient, ok := c.chairClients[chairServerID]
	if !ok {
		return nil, CodeError(ErrorCodeNotFoundChairClient)
	}
	return chairClient, nil
}

func (c *WorldClient) SendChairCoordinate(ctx *world.Context, chair *world.Chair) error {
	chairClient, err := c.getChairClient(chair.ServerID)
	if err != nil {
		return err
	}
	_, err = chairClient.client.ChairPostCoordinate(c.ctx, &api.Coordinate{
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
	_, err = chairClient.client.ChairPostRequestAccept(c.ctx, req.ServerID)
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

	_, err = chairClient.client.ChairPostRequestDeny(c.ctx, serverRequestID)
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

	_, err = chairClient.client.ChairPostRequestDepart(c.ctx, req.ServerID)
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
	_, err = userClient.client.AppPostRequestEvaluate(c.ctx, req.ServerID, &api.AppPostRequestEvaluateReq{
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
	response, err := userClient.client.AppPostRequest(c.ctx, &api.AppPostRequestReq{
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

	_, err = chairClient.client.ChairPostActivate(c.ctx)
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

	_, err = chairClient.client.ChairPostDeactivate(c.ctx)
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

	_, err = chairClient.client.ChairGetRequest(c.ctx, serverRequestID)
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToGetChairRequest, err)
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

	client.AddRequestModifier(func(req *http.Request) {
		req.Header.Set("Authorization", "Bearer "+response.AccessToken)
	})

	c.userClients[response.ID] = &userClient{
		client: client,
	}

	return &world.RegisterUserResponse{
		ServerUserID: response.ID,
		AccessToken:  response.AccessToken,
	}, nil
}

func (c *WorldClient) RegisterProvider(ctx *world.Context, data *world.RegisterProviderRequest) (*world.RegisterProviderResponse, error) {
	client, err := webapp.NewClient(c.webappClientConfig)
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToCreateWebappClient, err)
	}

	response, err := client.ProviderPostRegister(c.ctx, &api.ProviderPostRegisterReq{
		Name: data.Name,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToRegisterProvider, err)
	}

	client.AddRequestModifier(func(req *http.Request) {
		req.Header.Set("Authorization", "Bearer "+response.AccessToken)
	})

	c.providerClients[response.ID] = &providerClient{
		client: client,
	}

	return &world.RegisterProviderResponse{
		ServerProviderID: response.ID,
		AccessToken:     response.AccessToken,
	}, nil
}

func (c *WorldClient) RegisterChair(ctx *world.Context, provider *world.Provider, data *world.RegisterChairRequest) (*world.RegisterChairResponse, error) {
	providerClient, err := c.getProviderClient(provider.ServerID)
	if err != nil {
		return nil, err
	}

	response, err := providerClient.client.ChairPostRegister(c.ctx, &api.ChairPostRegisterReq{
		Name:    data.Name,
		Model:  data.Model,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToRegisterChair, err)
	}

	client, err := webapp.NewClient(c.webappClientConfig)
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToCreateWebappClient, err)
	}

	client.AddRequestModifier(func(req *http.Request) {
		req.Header.Set("Authorization", "Bearer "+response.AccessToken)
	})

	c.chairClients[response.ID] = &chairClient{
		client: client,
	}

	return &world.RegisterChairResponse{
		ServerUserID: response.ID,
		AccessToken:  response.AccessToken,
	}, nil
}

func (c *WorldClient) RegisterPaymentMethods(ctx *world.Context, user *world.User) error {
	userClient, err := c.getUserClient(user.ServerID)
	if err != nil {
		return err
	}

	_, err = userClient.client.AppPostPaymentMethods(c.ctx, &api.AppPostPaymentMethodsReq{Token: user.PaymentToken})
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostPaymentMethods, err)
	}
	return nil
}

type notificationConnectionImpl struct {
	close func()
}

func (c *notificationConnectionImpl) Close() {
	c.close()
}

func (c *WorldClient) ConnectUserNotificationStream(ctx *world.Context, user *world.User, receiver world.NotificationReceiverFunc) (world.NotificationStream, error) {
	newCtx, cancel := context.WithCancel(c.ctx)
	c.userClients[user.ServerID].sseContext = newCtx
	go func() {
		c.contestantLogger.Info("User notification stream started", zap.String("user_id", user.ServerID))
		userClient, err := c.getUserClient(user.ServerID)
		if err != nil {
			return
		}

		for {
			select {
			case <-userClient.sseContext.Done():
				c.contestantLogger.Info("User notification stream closed", zap.String("user_id", user.ServerID))
				return
			default:
			}

			res, result, err := userClient.client.AppGetNotification(userClient.sseContext)
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
					event = &world.UserNotificationEventCompleted{}
				case api.RequestStatusCANCELED:
					// event = &world.UserNotificationEventCanceled{}
				}
				if event == nil {
					// c.contestantLogger.Warn("Unexpected user notification", zap.Any("request", receivedRequest))
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
		close: cancel,
	}, nil
}

func (c *WorldClient) ConnectChairNotificationStream(ctx *world.Context, chair *world.Chair, receiver world.NotificationReceiverFunc) (world.NotificationStream, error) {
	newCtx, cancel := context.WithCancel(c.ctx)
	c.chairClients[chair.ServerID].sseContext = newCtx
	go func() {
		c.contestantLogger.Info("Chair notification stream started", zap.String("chair_id", chair.ServerID))
		chairClient, err := c.getChairClient(chair.ServerID)
		if err != nil {
			return
		}

		for {
			select {
			case <-chairClient.sseContext.Done():
				c.contestantLogger.Info("Chair notification stream closed", zap.String("chair_id", chair.ServerID))
				return
			default:
			}

			res, result, err := chairClient.client.ChairGetNotification(chairClient.sseContext)
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
					event = &world.ChairNotificationEventCompleted{
						ServerRequestID: receivedRequest.RequestID,
					}
				case api.RequestStatusCANCELED:
					// event = &world.ChairNotificationEventCanceled{}
				}
				if event == nil {
					// c.contestantLogger.Warn("Unexpected chair notification", zap.Any("request", receivedRequest))
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
		close: cancel,
	}, nil
}
