package scenario

import (
	"context"
	"log/slog"
	"time"

	"github.com/isucon/isucandar"
)

// Validation はシナリオの結果検証処理を行う
func (s *Scenario) Validation(ctx context.Context, step *isucandar.BenchmarkStep) error {
	// 負荷走行終了後、payment server へのリクエストが届くかもしれないので5秒だけ待つ
	time.Sleep(5 * time.Second)
	s.paymentServer.Close()
	s.sendResultWait.Wait()

	actual := s.world.PaymentDB.TotalPayment() + s.TotalDiscount()
	expected := s.TotalSales()
	if actual != expected {
		s.contestantLogger.Error("決済サーバーで決済された額とユーザーが支払うべき額が一致していません", slog.Int64("diff(actual-expected)", actual-expected))
	}

	for _, region := range s.world.Regions {
		s.contestantLogger.Info("最終地域情報",
			slog.String("名前", region.Name),
			slog.Int("ユーザー登録数", region.UsersDB.Len()),
			slog.Int("アクティブユーザー数", region.ActiveUserNum()),
		)
	}
	for _, owner := range s.world.OwnerDB.Iter() {
		s.contestantLogger.Info("最終オーナー情報",
			slog.String("名前", owner.RegisteredData.Name),
			slog.Int64("売上", owner.TotalSales.Load()),
			slog.Int("椅子数", owner.ChairDB.Len()),
		)
	}
	s.contestantLogger.Info("結果", slog.Bool("pass", !s.failed), slog.Int64("スコア", s.Score(true)), slog.Any("種別エラー数", s.world.ErrorCounter.Count()))
	return sendResult(s, true, !s.failed)
}
