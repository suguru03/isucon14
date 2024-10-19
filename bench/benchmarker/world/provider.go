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

	chairCountPerModel map[*ChairModel]int
	// createChairTryCount 椅子の追加登録を行った回数(成功したかどうかは問わない)
	createChairTryCount int
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

	if ctx.CurrentTime()%LengthOfHour == LengthOfHour-1 {
		_, err := p.Client.GetProviderSales(ctx, p)
		if err != nil {
			return WrapCodeError(ErrorCodeFailedToGetProviderSales, err)
		}
	} else {
		// TODO: 売り上げ取得で売上を確認してから椅子を増やすようにする
		if increase := int(p.TotalSales.Load()/15000) - p.createChairTryCount; increase > 0 {
			ctx.ContestantLogger().Info("一定の売上が立ったためProviderのChairが増加します", slog.Int("id", int(p.ID)), slog.Int("increase", increase))
			for range increase {
				p.createChairTryCount++
				_, err := p.World.CreateChair(ctx, &CreateChairArgs{
					Provider:          p,
					InitialCoordinate: RandomCoordinateOnRegionWithRand(p.Region, p.Rand),
					Model:             ChairModels[(p.createChairTryCount-1)%len(ChairModels)],
				})
				if err != nil {
					// 登録に失敗した椅子はリトライされない
					return err
				}
			}
		}
	}
	return nil
}

func (p *Provider) AddChair(c *Chair) {
	p.ChairDB.Set(c.ID, c)
	p.chairCountPerModel[c.Model]++
}
