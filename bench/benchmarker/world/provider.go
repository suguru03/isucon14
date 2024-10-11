package world

import (
	"fmt"
	"math/rand/v2"
	"sync/atomic"

	"github.com/isucon/isucon14/bench/internal/concurrent"
)

type ProviderID int

type Provider struct {
	// ID ベンチマーカー内部プロバイダーID
	ID ProviderID
	// ServerID サーバー上でのプロバイダーID
	ServerID string
	// Region 椅子を配置する地域
	Region *Region
	// ChairDB 管理している椅子
	ChairDB *concurrent.SimpleMap[ChairID, *Chair]
	// TotalSales 管理している椅子による売上の合計
	TotalSales atomic.Int64

	// RegisteredData サーバーに登録されているプロバイダー情報
	RegisteredData RegisteredProviderData
	// AccessToken サーバーアクセストークン
	AccessToken string

	// Rand 専用の乱数
	Rand *rand.Rand
	// tickDone 行動が完了しているかどうか
	tickDone atomic.Bool
}

type RegisteredProviderData struct {
	Name string
}

func (p *Provider) String() string {
	return fmt.Sprintf("Provider{id=%d}", p.ID)
}

func (p *Provider) SetID(id ProviderID) {
	p.ID = id
}

func (p *Provider) Tick(ctx *Context) error {
	if !p.tickDone.CompareAndSwap(true, false) {
		return nil
	}
	defer func() {
		if !p.tickDone.CompareAndSwap(false, true) {
			panic("2重でProviderのTickが終了した")
		}
	}()

	if ctx.world.Time%LengthOfHour == LengthOfHour-1 {
		_, err := ctx.client.GetProviderSales(ctx, p)
		if err != nil {
			return WrapCodeError(ErrorCodeFailedToGetProviderSales, err)
		}
	}
	return nil
}
