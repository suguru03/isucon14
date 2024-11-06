package scenario

import (
	"context"
	"log/slog"

	"github.com/isucon/isucandar"
	"github.com/isucon/isucon14/bench/benchmarker/world"
	"github.com/samber/lo"
)

// Validation はシナリオの結果検証処理を行う
func (s *Scenario) Validation(ctx context.Context, step *isucandar.BenchmarkStep) error {
	actual := s.world.PaymentDB.TotalPayment() + s.TotalDiscount()
	expected := s.Score()
	if actual != expected {
		s.contestantLogger.Error("決済サーバーで決済された額とユーザーが支払うべき額が一致していません", slog.Int64("diff(actual-expected)", actual-expected))
	}

	for _, region := range s.world.Regions {
		s.contestantLogger.Info("最終Region情報",
			slog.String("region", region.Name),
			slog.Int("users", region.UsersDB.Len()),
			slog.Int("active_users", region.ActiveUserNum()),
		)
	}
	for id, provider := range s.world.ProviderDB.Iter() {
		s.contestantLogger.Info("最終Provider情報",
			slog.Int("id", int(id)),
			slog.Int64("total_sales", provider.TotalSales.Load()),
			slog.Int("chairs", provider.ChairDB.Len()),
			slog.Int("chairs_outside_region", lo.CountBy(provider.ChairDB.ToSlice(), func(c *world.Chair) bool { return !c.Location.Current().Within(provider.Region) })),
			slog.Int("total_chair_travel_distance", lo.SumBy(provider.ChairDB.ToSlice(), func(c *world.Chair) int { return c.Location.TotalTravelDistance() })),
		)
	}
	s.contestantLogger.Info("種別エラー発生数", slog.Any("errors", s.world.ErrorCounter.Count()))
	return sendResult(s, true, true)
}
