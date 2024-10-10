package world

import (
	"log"
	"math/rand/v2"
	"time"

	"github.com/isucon/isucon14/bench/internal/concurrent"
	"github.com/isucon/isucon14/bench/internal/random"
)

const (
	// LengthOfMinute 仮想世界の1分の長さ
	LengthOfMinute = 1 // 1Tickが1分
	// LengthOfHour 仮想世界の1時間の長さ
	LengthOfHour = LengthOfMinute * 60
	// LengthOfDay 仮想世界の1日の長さ
	LengthOfDay = LengthOfHour * 24
)

type World struct {
	// Time 仮想世界開始からの経過時間
	Time int64
	// TimeOfDay 仮想世界の1日の時刻
	TimeOfDay int
	// Regions 地域
	Regions map[int]*Region
	// UserDB 全ユーザーDB
	UserDB *GenericDB[UserID, *User]
	// ProviderDB 全プロバイダーDB
	ProviderDB *GenericDB[ProviderID, *Provider]
	// ChairDB 全椅子DB
	ChairDB *GenericDB[ChairID, *Chair]
	// RequestDB 全リクエストDB
	RequestDB *RequestDB
	// PaymentDB 支払い結果DB
	PaymentDB *PaymentDB
	// RootRand ルートの乱数生成器
	RootRand *rand.Rand
	// CompletedRequestChan 完了したリクエストのチャンネル
	CompletedRequestChan chan *Request

	tickTimeout     time.Duration
	timeoutTicker   *time.Ticker
	wg              concurrent.WaitGroupWithCount
	criticalErrorCh chan error

	// TimeoutTickCount タイムアウトしたTickの累計数
	TimeoutTickCount int
}

func NewWorld(tickTimeout time.Duration, completedRequestChan chan *Request) *World {
	region := &Region{
		RegionWidth:   30,
		RegionHeight:  30,
		RegionOffsetX: 0,
		RegionOffsetY: 0,
	}
	return &World{
		Regions:   map[int]*Region{1: region},
		UserDB:    NewGenericDB[UserID, *User](),
		ProviderDB: NewGenericDB[ProviderID, *Provider](),
		ChairDB:   NewGenericDB[ChairID, *Chair](),
		RequestDB: NewRequestDB(),
		PaymentDB: NewPaymentDB(),
		// TODO シードをどうする
		RootRand:             random.NewLockedRand(rand.NewPCG(0, 0)),
		CompletedRequestChan: completedRequestChan,
		tickTimeout:          tickTimeout,
		timeoutTicker:        time.NewTicker(tickTimeout),
		criticalErrorCh:      make(chan error),
	}
}

func (w *World) Tick(ctx *Context) error {
	var done bool

	for _, u := range w.UserDB.Iter() {
		w.wg.Add(1)
		go func() {
			defer w.wg.Done()
			err := u.Tick(ctx)
			if err != nil {
				w.HandleTickError(ctx, err)
			}
		}()
	}
	for _, p := range w.ProviderDB.Iter() {
		w.wg.Add(1)
		go func() {
			defer w.wg.Done()
			err := p.Tick(ctx)
			if err != nil {
				w.HandleTickError(ctx, err)
			}
		}()
	}
	for _, c := range w.ChairDB.Iter() {
		w.wg.Add(1)
		go func() {
			defer w.wg.Done()
			err := c.Tick(ctx)
			if err != nil {
				w.HandleTickError(ctx, err)
			}
		}()
	}

	go func() {
		w.wg.Wait()
		done = true
	}()

	select {
	// クリティカルエラーが発生
	case err := <-w.criticalErrorCh:
		return err

	// タイムアウト
	case <-w.timeoutTicker.C:
		if !done {
			// タイムアウトまでにエンティティの行動が全て完了しなかった
			w.TimeoutTickCount++
		}
	}

	w.Time++
	w.TimeOfDay = int(w.Time % LengthOfDay)

	return nil
}

type CreateUserArgs struct {
	// Region ユーザーを配置する地域
	Region *Region
}

// CreateUser 仮想世界にユーザーを作成する
func (w *World) CreateUser(ctx *Context, args *CreateUserArgs) (*User, error) {
	registeredData := RegisteredUserData{
		UserName:    random.GenerateUserName(),
		FirstName:   random.GenerateFirstName(),
		LastName:    random.GenerateLastName(),
		DateOfBirth: random.GenerateDateOfBirth(),
	}

	res, err := ctx.client.RegisterUser(ctx, &RegisterUserRequest{
		UserName:    registeredData.UserName,
		FirstName:   registeredData.FirstName,
		LastName:    registeredData.LastName,
		DateOfBirth: registeredData.DateOfBirth,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToRegisterUser, err)
	}

	u := &User{
		ServerID:          res.ServerUserID,
		Region:            args.Region,
		State:             UserStatePaymentMethodsNotRegister,
		RegisteredData:    registeredData,
		AccessToken:       res.AccessToken,
		PaymentToken:      random.GeneratePaymentToken(),
		Rand:              random.CreateChildRand(w.RootRand),
		notificationQueue: make(chan NotificationEvent, 100),
	}
	u.tickDone.Store(true)
	w.PaymentDB.PaymentTokens.Set(u.PaymentToken, u)
	return w.UserDB.Create(u), nil
}

type CreateProviderArgs struct {}

// CreateProvider 仮想世界に椅子のプロバイダーを作成する
func (w *World) CreateProvider(ctx *Context, args *CreateProviderArgs) (*Provider, error) {
	registeredData := RegisteredProviderData{
		Name: random.GenerateProviderName(),
	}

	res, err := ctx.client.RegisterProvider(ctx, &RegisterProviderRequest{
		Name: registeredData.Name,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToRegisterProvider, err)
	}

	p := &Provider{
		ServerID:          res.ServerProviderID,
		RegisteredData:    registeredData,
		AccessToken:       res.AccessToken,
		Rand:              random.CreateChildRand(w.RootRand),
	}
	p.tickDone.Store(true)
	return w.ProviderDB.Create(p), nil
}

type CreateChairArgs struct {
	// Provider 椅子のプロバイダー
	Provider *Provider
	// Region 椅子を配置する地域
	Region *Region
	// InitialCoordinate 椅子の初期位置
	InitialCoordinate Coordinate
	// WorkTime 稼働時間
	WorkTime Interval[int]
}

// CreateChair 仮想世界に椅子を作成する
func (w *World) CreateChair(ctx *Context, args *CreateChairArgs) (*Chair, error) {
	registeredData := RegisteredChairData{
		Name:    random.GenerateChairName(),
		// TODO modelの扱い
		Model: random.GenerateChairModel(),
	}

	res, err := ctx.client.RegisterChair(ctx, args.Provider, &RegisterChairRequest{
		Name:    registeredData.Name,
		Model:  registeredData.Model,
	})
	if err != nil {
		return nil, WrapCodeError(ErrorCodeFailedToRegisterChair, err)
	}

	c := &Chair{
		ServerID:          res.ServerUserID,
		Region:            args.Region,
		Current:           args.InitialCoordinate,
		Speed:             2, // TODO 速度どうする
		State:             ChairStateInactive,
		WorkTime:          args.WorkTime,
		RegisteredData:    registeredData,
		AccessToken:       res.AccessToken,
		Rand:              random.CreateChildRand(w.RootRand),
		notificationQueue: make(chan NotificationEvent, 100),
	}
	c.tickDone.Store(true)
	return w.ChairDB.Create(c), nil
}

func (w *World) HandleTickError(ctx *Context, err error) {
	if errs, ok := UnwrapMultiError(err); ok {
		for _, err2 := range errs {
			if IsCriticalError(err2) {
				w.criticalErrorCh <- err2
			} else {
				// TODO: エラーペナルティ
				log.Println(err2)
			}
		}
	} else if IsCriticalError(err) {
		w.criticalErrorCh <- err
	} else {
		// TODO: エラーペナルティ
		log.Println(err)
	}
}
