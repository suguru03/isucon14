package world

type Client interface {
	// SendChairCoordinate サーバーに椅子の座標を送信する
	SendChairCoordinate(ctx *Context, chair *Chair) error
	// SendAcceptRequest サーバーに配椅子要求を受理することを報告する
	SendAcceptRequest(ctx *Context, req *Request) error
	// SendDenyRequest サーバーに配椅子要求を受理することを報告する
	SendDenyRequest(ctx *Context, serverRequestID string) error
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
}

type SendCreateRequestResponse struct {
	ServerRequestID string
}

type GetRequestByChairResponse struct{}
