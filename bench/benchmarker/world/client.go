package world

type Client interface {
	// SendChairCoordinate サーバーに椅子の座標を送信する
	SendChairCoordinate(ctx *Context, chair *Chair) error
	// SendAcceptRequest サーバーに配椅子要求を受理することを報告する
	SendAcceptRequest(ctx *Context, chair *Chair, req *Request) error
	// SendDenyRequest サーバーに配椅子要求を受理することを報告する
	SendDenyRequest(ctx *Context, chair *Chair, serverRequestID string) error
	// SendDepart サーバーに客が搭乗完了して出発することを報告する
	SendDepart(ctx *Context, req *Request) error
	// SendEvaluation サーバーに今回の送迎の評価を送信する
	SendEvaluation(ctx *Context, req *Request) error
	// SendCreateRequest サーバーにリクエスト作成を送信する
	SendCreateRequest(ctx *Context, req *Request) (*SendCreateRequestResponse, error)
	// SendActivate サーバーにリクエストの受付開始を通知する
	SendActivate(ctx *Context, chair *Chair) error
	// SendDeactivate サーバーにリクエストの受付停止を通知する
	SendDeactivate(ctx *Context, chair *Chair) error
	// GetRequestByChair サーバーからリクエストの詳細を取得する(椅子側)
	GetRequestByChair(ctx *Context, chair *Chair, serverRequestID string) (*GetRequestByChairResponse, error)
	// RegisterUser サーバーにユーザーを登録する
	RegisterUser(ctx *Context, data *RegisterUserRequest) (*RegisterUserResponse, error)
	// RegisterProvider サーバーにプロバイダーを登録する
	RegisterProvider(ctx *Context, data *RegisterProviderRequest) (*RegisterProviderResponse, error)
	// RegisterChair サーバーにユーザーを登録する
	RegisterChair(ctx *Context, provider *Provider, data *RegisterChairRequest) (*RegisterChairResponse, error)
	// RegisterPaymentMethods サーバーにユーザーの支払い情報を登録する
	RegisterPaymentMethods(ctx *Context, user *User) error
	// ConnectUserNotificationStream ユーザー用の通知ストリームに接続する
	ConnectUserNotificationStream(ctx *Context, user *User, receiver NotificationReceiverFunc) (NotificationStream, error)
	// ConnectChairNotificationStream 椅子用の通知ストリームに接続する
	ConnectChairNotificationStream(ctx *Context, chair *Chair, receiver NotificationReceiverFunc) (NotificationStream, error)
}

type SendCreateRequestResponse struct {
	ServerRequestID string
}

type GetRequestByChairResponse struct{}

type RegisterUserRequest struct {
	UserName    string
	FirstName   string
	LastName    string
	DateOfBirth string
}

type RegisterUserResponse struct {
	ServerUserID string
	AccessToken  string
}

type RegisterProviderRequest struct {
	Name string
}

type RegisterProviderResponse struct {
	ServerProviderID string
	AccessToken      string
}

type RegisterChairRequest struct {
	Name    string
	Model  string
}

type RegisterChairResponse struct {
	ServerUserID string
	AccessToken  string
}

type NotificationReceiverFunc func(event NotificationEvent)

type NotificationStream interface {
	Close()
}
