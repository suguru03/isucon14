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
	ctx              context.Context
	sseContext       context.Context
	client           *webapp.Client
	contestantLogger *zap.Logger
}

type providerClient struct {
	ctx                context.Context
	client             *webapp.Client
	contestantLogger   *zap.Logger
	webappClientConfig webapp.ClientConfig
}

type chairClient struct {
	ctx              context.Context
	sseContext       context.Context
	client           *webapp.Client
	contestantLogger *zap.Logger
}

type WorldClient struct {
	ctx                context.Context
	webappClientConfig webapp.ClientConfig
	contestantLogger   *zap.Logger
}

func NewWorldClient(ctx context.Context, webappClientConfig webapp.ClientConfig, contestantLogger *zap.Logger) *WorldClient {
	return &WorldClient{
		ctx:                ctx,
		webappClientConfig: webappClientConfig,
		contestantLogger:   contestantLogger,
	}
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

	return &world.RegisterUserResponse{
		ServerUserID: response.ID,
		AccessToken:  response.AccessToken,
		Client: &userClient{
			ctx:              c.ctx,
			client:           client,
			contestantLogger: c.contestantLogger,
		},
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

	return &world.RegisterProviderResponse{
		ServerProviderID: response.ID,
		AccessToken:      response.AccessToken,
		Client: &providerClient{
			ctx:                c.ctx,
			client:             client,
			contestantLogger:   c.contestantLogger,
			webappClientConfig: c.webappClientConfig,
		},
	}, nil
}

func (c *providerClient) GetProviderSales(ctx *world.Context, provider *world.Provider) (*world.GetProviderSalesResponse, error) {
	// TODO: ちゃんと実装する
	_, err := c.client.ProviderGetSales(c.ctx, &api.ProviderGetSalesParams{})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToGetProviderSales, err)
	}

	return &world.GetProviderSalesResponse{}, nil
}

func (c *providerClient) RegisterChair(ctx *world.Context, provider *world.Provider, data *world.RegisterChairRequest) (*world.RegisterChairResponse, error) {
	response, err := c.client.ChairPostRegister(c.ctx, &api.ChairPostRegisterReq{
		Name:  data.Name,
		Model: data.Model,
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

	return &world.RegisterChairResponse{
		ServerUserID: response.ID,
		AccessToken:  response.AccessToken,
		Client: &chairClient{
			ctx:              c.ctx,
			client:           client,
			contestantLogger: c.contestantLogger,
		},
	}, nil
}

func (c *chairClient) SendChairCoordinate(ctx *world.Context, chair *world.Chair) error {
	_, err := c.client.ChairPostCoordinate(c.ctx, &api.Coordinate{
		Latitude:  chair.Current.X,
		Longitude: chair.Current.Y,
	})
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostCoordinate, err)
	}

	return nil
}

func (c *chairClient) SendAcceptRequest(ctx *world.Context, chair *world.Chair, req *world.Request) error {
	_, err := c.client.ChairPostRequestAccept(c.ctx, req.ServerID)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostAccept, err)
	}

	return nil
}

func (c *chairClient) SendDenyRequest(ctx *world.Context, chair *world.Chair, serverRequestID string) error {
	_, err := c.client.ChairPostRequestDeny(c.ctx, serverRequestID)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostDeny, err)
	}

	return nil
}

func (c *chairClient) SendDepart(ctx *world.Context, req *world.Request) error {
	_, err := c.client.ChairPostRequestDepart(c.ctx, req.ServerID)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostDepart, err)
	}

	return nil
}

func (c *chairClient) SendActivate(ctx *world.Context, chair *world.Chair) error {
	_, err := c.client.ChairPostActivate(c.ctx)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostActivate, err)
	}

	return nil
}

func (c *chairClient) SendDeactivate(ctx *world.Context, chair *world.Chair) error {
	_, err := c.client.ChairPostDeactivate(c.ctx)
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostDeactivate, err)
	}

	return nil
}

func (c *chairClient) GetRequestByChair(ctx *world.Context, chair *world.Chair, serverRequestID string) (*world.GetRequestByChairResponse, error) {
	_, err := c.client.ChairGetRequest(c.ctx, serverRequestID)
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToGetChairRequest, err)
	}

	// TODO: GetRequestByChairResponse の中身入れる
	return &world.GetRequestByChairResponse{}, nil
}

func (c *chairClient) ConnectChairNotificationStream(ctx *world.Context, chair *world.Chair, receiver world.NotificationReceiverFunc) (world.NotificationStream, error) {
	newCtx, cancel := context.WithCancel(c.ctx)
	c.sseContext = newCtx
	go func() {
		//c.contestantLogger.Info("Chair notification stream started", zap.String("chair_id", chair.ServerID))
		for {
			select {
			case <-c.sseContext.Done():
				//c.contestantLogger.Info("Chair notification stream closed", zap.String("chair_id", chair.ServerID))
				return
			default:
			}

			res, result, err := c.client.ChairGetNotification(c.sseContext)
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

func (c *userClient) SendEvaluation(ctx *world.Context, req *world.Request, score int) error {
	_, err := c.client.AppPostRequestEvaluate(c.ctx, req.ServerID, &api.AppPostRequestEvaluateReq{
		Evaluation: score,
	})
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostEvaluate, err)
	}

	return nil
}

func (c *userClient) SendCreateRequest(ctx *world.Context, req *world.Request) (*world.SendCreateRequestResponse, error) {
	pickup := req.PickupPoint
	destination := req.DestinationPoint
	response, err := c.client.AppPostRequest(c.ctx, &api.AppPostRequestReq{
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

	return &world.SendCreateRequestResponse{ServerRequestID: response.RequestID}, nil
}

func (c *userClient) RegisterPaymentMethods(ctx *world.Context, user *world.User) error {
	_, err := c.client.AppPostPaymentMethods(c.ctx, &api.AppPostPaymentMethodsReq{Token: user.PaymentToken})
	if err != nil {
		return WrapCodeError(ErrorCodeFailedToPostPaymentMethods, err)
	}
	return nil
}

func (c *userClient) ConnectUserNotificationStream(ctx *world.Context, user *world.User, receiver world.NotificationReceiverFunc) (world.NotificationStream, error) {
	newCtx, cancel := context.WithCancel(c.ctx)
	c.sseContext = newCtx
	go func() {
		//c.contestantLogger.Info("User notification stream started", zap.String("user_id", user.ServerID))
		for {
			select {
			case <-c.sseContext.Done():
				//c.contestantLogger.Info("User notification stream closed", zap.String("user_id", user.ServerID))
				return
			default:
			}

			res, result, err := c.client.AppGetNotification(c.sseContext)
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
					event = &world.UserNotificationEventDispatching{
						ServerRequestID: receivedRequest.RequestID,
					}
				case api.RequestStatusDISPATCHED:
					event = &world.UserNotificationEventDispatched{
						ServerRequestID: receivedRequest.RequestID,
					}
				case api.RequestStatusCARRYING:
					event = &world.UserNotificationEventCarrying{
						ServerRequestID: receivedRequest.RequestID,
					}
				case api.RequestStatusARRIVED:
					event = &world.UserNotificationEventArrived{
						ServerRequestID: receivedRequest.RequestID,
					}
				case api.RequestStatusCOMPLETED:
					event = &world.UserNotificationEventCompleted{
						ServerRequestID: receivedRequest.RequestID,
					}
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

type notificationConnectionImpl struct {
	close func()
}

func (c *notificationConnectionImpl) Close() {
	c.close()
}
