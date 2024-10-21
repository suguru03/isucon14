package world

import (
	"fmt"
	"log/slog"
	"math/rand/v2"
	"sync/atomic"
	"time"

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
			if err := p.ValidateSales(last.ServerCompletedAt, res); err != nil {
				return WrapCodeError(ErrorCodeSalesMismatched, err)
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

func (p *Provider) ValidateSales(until time.Time, serverSide *GetProviderSalesResponse) error {
	totals := 0
	perChairs := lo.Associate(p.ChairDB.ToSlice(), func(c *Chair) (string, *ChairSales) {
		return c.ServerID, &ChairSales{
			ID:    c.ServerID,
			Name:  c.RegisteredData.Name,
			Sales: 0,
		}
	})
	perModels := lo.MapEntries(p.chairCountPerModel, func(m *ChairModel, _ int) (string, *ChairSalesPerModel) {
		return m.Name, &ChairSalesPerModel{Model: m.Name}
	})
	for _, r := range p.CompletedRequest.Iter() {
		if r.ServerCompletedAt.After(until) {
			continue
		}

		cs, ok := perChairs[r.Chair.ServerID]
		if !ok {
			panic("unexpected")
		}
		cspm, ok := perModels[r.Chair.Model.Name]
		if !ok {
			panic("unexpected")
		}

		fare := r.Fare()
		cs.Sales += fare
		cspm.Sales += fare
		totals += fare
	}

	// 椅子毎の売り上げ検証
	if p.ChairDB.Len() != len(serverSide.Chairs) {
		return fmt.Errorf("椅子ごとの売り上げ情報が足りていません")
	}
	for _, chair := range serverSide.Chairs {
		sales, ok := perChairs[chair.ID]
		if !ok {
			return fmt.Errorf("期待していない椅子による売り上げが存在します (id: %s)", chair.ID)
		}
		if sales.Name != chair.Name {
			return fmt.Errorf("nameが一致しないデータがあります (id: %s, got: %s, want: %s)", chair.ID, chair.Name, sales.Name)
		}
		if sales.Sales != chair.Sales {
			return fmt.Errorf("salesがずれているデータがあります (id: %s, got: %d, want: %d)", chair.ID, sales.Sales, chair.Sales)
		}
	}

	// モデル毎の売り上げ検証
	if len(perModels) != len(serverSide.Models) {
		return fmt.Errorf("モデルごとの売り上げ情報が足りていません")
	}
	for _, model := range serverSide.Models {
		sales, ok := perModels[model.Model]
		if !ok {
			return fmt.Errorf("期待していない椅子モデルによる売り上げが存在します (id: %s)", model.Model)
		}
		if sales.Sales != model.Sales {
			return fmt.Errorf("salesがずれているデータがあります (model: %s, got: %d, want: %d)", model.Model, sales.Sales, model.Sales)
		}
	}

	// Totalの検証
	if totals != serverSide.Total {
		return fmt.Errorf("total_salesがズレています (got: %d, want: %d)", serverSide.Total, totals)
	}

	return nil
}
