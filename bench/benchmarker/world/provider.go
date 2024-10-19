package world

import (
	"fmt"
	"log/slog"
	"math/rand/v2"
	"sync/atomic"

	"github.com/isucon/isucon14/bench/internal/concurrent"
	"github.com/samber/lo"
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
	// CompletedRequest 管理している椅子が完了したリクエスト
	CompletedRequest *concurrent.SimpleSlice[*Request]

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
		last := lo.MaxBy(p.CompletedRequest.ToSlice(), func(a *Request, b *Request) bool { return a.ServerCompletedAt.After(b.ServerCompletedAt) })
		if last != nil {
			res, err := p.Client.GetProviderSales(ctx, &GetProviderSalesRequest{
				Until: last.ServerCompletedAt,
			})
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToGetProviderSales, err)
			}
			if expected := lo.SumBy(lo.Filter(p.CompletedRequest.ToSlice(), func(r *Request, _ int) bool { return !r.ServerCompletedAt.After(last.ServerCompletedAt) }), func(r *Request) int { return r.Fare() }); expected != res.Total {
				return WrapCodeError(ErrorCodeSalesMismatched, fmt.Errorf("売り上げ情報がズレています (got: %d, expected: %d)", res.Total, expected))
			}

			if increase := res.Total/15000 - p.createChairTryCount; increase > 0 {
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
	}
	return nil
}

func (p *Provider) AddChair(c *Chair) {
	p.ChairDB.Set(c.ID, c)
	p.chairCountPerModel[c.Model]++
}
