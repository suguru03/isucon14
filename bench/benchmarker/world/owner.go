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

type OwnerID int

type Owner struct {
	// ID ベンチマーカー内部オーナーID
	ID OwnerID
	// ServerID サーバー上でのオーナーID
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

	// RegisteredData サーバーに登録されているオーナー情報
	RegisteredData RegisteredOwnerData

	// Client webappへのクライアント
	Client OwnerClient
	// Rand 専用の乱数
	Rand *rand.Rand
	// tickDone 行動が完了しているかどうか
	tickDone tickDone

	chairCountPerModel map[*ChairModel]int
	// createChairTryCount 椅子の追加登録を行った回数(成功したかどうかは問わない)
	createChairTryCount int
}

type RegisteredOwnerData struct {
	Name               string
	ChairRegisterToken string
}

func (p *Owner) String() string {
	return fmt.Sprintf("Owner{id=%d}", p.ID)
}

func (p *Owner) SetID(id OwnerID) {
	p.ID = id
}

func (p *Owner) GetServerID() string {
	return p.ServerID
}

func (p *Owner) Tick(ctx *Context) error {
	if p.tickDone.DoOrSkip() {
		return nil
	}
	defer p.tickDone.Done()

	if ctx.CurrentTime()%LengthOfHour == LengthOfHour/2 {
		res, err := p.Client.GetOwnerChairs(ctx, &GetOwnerChairsRequest{})
		if err != nil {
			return WrapCodeError(ErrorCodeFailedToGetOwnerChairs, err)
		}
		if err := p.ValidateChairs(res); err != nil {
			return WrapCodeError(ErrorCodeIncorrectOwnerChairsData, err)
		}
	} else if ctx.CurrentTime()%LengthOfHour == LengthOfHour-1 {
		last := lo.MaxBy(p.CompletedRequest.ToSlice(), func(a *Request, b *Request) bool { return a.ServerCompletedAt.After(b.ServerCompletedAt) })
		if last != nil {
			res, err := p.Client.GetOwnerSales(ctx, &GetOwnerSalesRequest{
				Until: last.ServerCompletedAt.Add(1 * time.Millisecond), // webapp側のDBの精度との違いを吸収するために1ms追加して取る
			})
			if err != nil {
				return WrapCodeError(ErrorCodeFailedToGetOwnerSales, err)
			}
			if err := p.ValidateSales(last.ServerCompletedAt, res); err != nil {
				return WrapCodeError(ErrorCodeSalesMismatched, err)
			}
			if increase := res.Total/15000 - p.createChairTryCount; increase > 0 {
				ctx.ContestantLogger().Info("一定の売上が立ったためOwnerのChairが増加します", slog.Int("id", int(p.ID)), slog.Int("increase", increase))
				for range increase {
					p.createChairTryCount++
					_, err := p.World.CreateChair(ctx, &CreateChairArgs{
						Owner:             p,
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

func (p *Owner) AddChair(c *Chair) {
	p.ChairDB.Set(c.ID, c)
	p.chairCountPerModel[c.Model]++
}

func (p *Owner) ValidateSales(until time.Time, serverSide *GetOwnerSalesResponse) error {
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

		fare := r.Sales()
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

func (p *Owner) ValidateChairs(serverSide *GetOwnerChairsResponse) error {
	if p.ChairDB.Len() != len(serverSide.Chairs) {
		return fmt.Errorf("オーナーの椅子の数が一致していません")
	}
	mapped := lo.Associate(serverSide.Chairs, func(c *OwnerChair) (string, *OwnerChair) { return c.ID, c })
	for _, chair := range p.ChairDB.Iter() {
		data, ok := mapped[chair.ServerID]
		if !ok {
			return fmt.Errorf("椅子一覧レスポンスに含まれていない椅子があります (id: %s)", chair.ServerID)
		}
		if data.Name != chair.RegisteredData.Name {
			return fmt.Errorf("nameが一致しないデータがあります (id: %s, got: %s, want: %s)", chair.ServerID, data.Name, chair.RegisteredData.Name)
		}
		if data.Model != chair.Model.Name {
			return fmt.Errorf("modelが一致しないデータがあります (id: %s, got: %s, want: %s)", chair.ServerID, data.Model, chair.Model.Name)
		}
		// アクティブ状態の検査はリクエストのタイミングでズレることがあるので、検査しない
		//if (data.Active && chair.State != ChairStateActive) || (!data.Active && chair.State != ChairStateInactive) {
		//	return fmt.Errorf("activeが一致しないデータがあります (id: %s, got: %v, want: %v)", chair.ServerID, data.Active, !data.Active)
		//}
		if data.TotalDistanceUpdatedAt.Valid {
			lastMovedAt, ok := chair.Location.LastMovedAt()
			if ok && data.TotalDistanceUpdatedAt.Time.Sub(lastMovedAt) > 3*time.Second {
				return fmt.Errorf("total_distanceの反映が遅いデータがあります (id: %s)", chair.ServerID)
			}
			want := chair.Location.TotalTravelDistanceUntil(data.TotalDistanceUpdatedAt.Time)
			if data.TotalDistance != want {
				return fmt.Errorf("total_distanceが一致しないデータがあります (id: %s, got: %v, want: %v)", chair.ServerID, data.TotalDistance, want)
			}
		}
		// TODO: RegisteredAtの検証
	}
	return nil
}
