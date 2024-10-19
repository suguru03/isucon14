package worldclient

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/isucon/isucon14/bench/benchmarker/webapp"
	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
	"github.com/isucon/isucon14/bench/benchmarker/world"
)

type userClient struct {
	ctx    context.Context
	client *webapp.Client
}

type providerClient struct {
	ctx                context.Context
	client             *webapp.Client
	webappClientConfig webapp.ClientConfig
}

type chairClient struct {
	ctx    context.Context
	client *webapp.Client
}

type WorldClient struct {
	ctx                context.Context
	webappClientConfig webapp.ClientConfig
}

func NewWorldClient(ctx context.Context, webappClientConfig webapp.ClientConfig) *WorldClient {
	return &WorldClient{
		ctx:                ctx,
		webappClientConfig: webappClientConfig,
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
			ctx:    c.ctx,
			client: client,
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
			ctx:    c.ctx,
			client: client,
		},
	}, nil
}

func (c *chairClient) SendChairCoordinate(ctx *world.Context, chair *world.Chair) error {
	_, err := c.client.ChairPostCoordinate(c.ctx, &api.Coordinate{
		Latitude:  chair.Location.Current().X,
		Longitude: chair.Location.Current().Y,
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
	sseContext, cancel := context.WithCancel(c.ctx)

	go func() {
		for r, err := range c.client.ChairGetNotification(sseContext) {
			if err != nil {
				if !errors.Is(err, context.Canceled) {
					// TODO ロギング
					slog.Debug(err.Error())
				}
				continue
			}

			var event world.NotificationEvent
			switch r.Status.Value {
			case api.RequestStatusMATCHING:
				event = &world.ChairNotificationEventMatched{
					ServerRequestID: r.RequestID,
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
					ServerRequestID: r.RequestID,
				}
			}
			if event == nil {
				// TODO: 意図しない通知の種類の減点
				continue
			}
			receiver(event)
		}
	}()

	return &notificationConnectionImpl{
		close: cancel,
	}, nil
}

func (c *userClient) SendEvaluation(ctx *world.Context, req *world.Request, score int) (*world.SendEvaluationResponse, error) {
	res, err := c.client.AppPostRequestEvaluate(c.ctx, req.ServerID, &api.AppPostRequestEvaluateReq{
		Evaluation: score,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToPostEvaluate, err)
	}

	completedAt, err := time.Parse(time.RFC3339Nano, res.CompletedAt)
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToPostEvaluate, err)
	}

	return &world.SendEvaluationResponse{
		Fare:        res.Fare,
		CompletedAt: completedAt,
	}, nil
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
	sseContext, cancel := context.WithCancel(c.ctx)

	go func() {
		for r, err := range c.client.AppGetNotification(sseContext) {
			if err != nil {
				if !errors.Is(err, context.Canceled) {
					// TODO ロギング
					slog.Debug(err.Error())
				}
				continue
			}

			var event world.NotificationEvent
			switch r.Status {
			case api.RequestStatusMATCHING:
				// event = &world.UserNotificationEventMatching{}
			case api.RequestStatusDISPATCHING:
				event = &world.UserNotificationEventDispatching{
					ServerRequestID: r.RequestID,
				}
			case api.RequestStatusDISPATCHED:
				event = &world.UserNotificationEventDispatched{
					ServerRequestID: r.RequestID,
				}
			case api.RequestStatusCARRYING:
				event = &world.UserNotificationEventCarrying{
					ServerRequestID: r.RequestID,
				}
			case api.RequestStatusARRIVED:
				event = &world.UserNotificationEventArrived{
					ServerRequestID: r.RequestID,
				}
			case api.RequestStatusCOMPLETED:
				event = &world.UserNotificationEventCompleted{
					ServerRequestID: r.RequestID,
				}
			}
			if event == nil {
				// TODO: 意図しない通知の種類の減点
				continue
			}
			receiver(event)
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
