package world

import (
	"fmt"
	"log/slog"
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
	// World Worldへの逆参照
	World *World
	// Region 椅子を配置する地域
	Region *Region
	// ChairDB 管理している椅子
	ChairDB *concurrent.SimpleMap[ChairID, *Chair]
	// TotalSales 管理している椅子による売上の合計
	TotalSales atomic.Int64

	// RegisteredData サーバーに登録されているプロバイダー情報
	RegisteredData RegisteredProviderData

	// Client webappへのクライアント
	Client ProviderClient
	// Rand 専用の乱数
	Rand *rand.Rand
	// tickDone 行動が完了しているかどうか
	tickDone tickDone
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
	if p.tickDone.DoOrSkip() {
		return nil
	}
	defer p.tickDone.Done()

	// TODO: 売り上げ取得で売上を確認してから椅子を増やすようにする
	if ctx.CurrentTime()%LengthOfHour == LengthOfHour-1 {
		_, err := p.Client.GetProviderSales(ctx, p)
		if err != nil {
			return WrapCodeError(ErrorCodeFailedToGetProviderSales, err)
		}
	} else {
		increase := p.TotalSales.Load()/10000 - int64(p.ChairDB.Len()) + 10
		if increase > 0 {
			ctx.ContestantLogger().Info("一定の売上が立ったためProviderのChairが増加します", slog.Int("id", int(p.ID)), slog.Int64("increase", increase))
			for range increase {
				_, err := p.World.CreateChair(ctx, &CreateChairArgs{
					Provider:          p,
					InitialCoordinate: RandomCoordinateOnRegionWithRand(p.Region, p.Rand),
					Model:             ChairModelA,
				})
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}
