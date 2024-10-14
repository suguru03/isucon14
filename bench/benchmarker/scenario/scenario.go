package scenario

import (
	"context"
	"net/http"
	"time"

	"github.com/isucon/isucandar"
	"github.com/isucon/isucon14/bench/benchmarker/scenario/worldclient"
	"github.com/isucon/isucon14/bench/benchmarker/webapp"
	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
	"github.com/isucon/isucon14/bench/benchmarker/world"
	"github.com/isucon/isucon14/bench/benchrun"
	"github.com/isucon/isucon14/bench/benchrun/gen/isuxportal/resources"
	"github.com/isucon/isucon14/bench/payment"
	"github.com/samber/lo"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.uber.org/zap"
)

// Scenario はシナリオを表す構造体
// 以下の関数を実装して b.AddScenario() で追加したあと b.Run() で実行される
// - Prepare(context.Context, *BenchmarkStep) error
//   - シナリオの初期化処理を行う
//   - Initialize した後に Validation を呼ぶことが多いっぽい
//   - Initialize -> Validation -> Initialize してもいいかも？（13とかはそうしてそう）
//
// - Load(context.Context, *BenchmarkStep) error
//   - シナリオのメイン処理を行う
//
// - Validation(context.Context, *BenchmarkStep) error
//   - シナリオの結果検証処理を行う
//   - 料金の整合性をみたいかも
type Scenario struct {
	target           string
	addr             string
	paymentURL       string
	contestantLogger *zap.Logger
	world            *world.World
	worldCtx         *world.Context
	paymentServer    *payment.Server
	step             *isucandar.BenchmarkStep
	reporter         benchrun.Reporter
	meter            metric.Meter

	completedRequestChan chan *world.Request
}

func NewScenario(target, addr, paymentURL string, contestantLogger *zap.Logger, reporter benchrun.Reporter, meter metric.Meter) *Scenario {
	completedRequestChan := make(chan *world.Request, 1000)
	worldClient := worldclient.NewWorldClient(context.Background(), webapp.ClientConfig{
		TargetBaseURL:         target,
		TargetAddr:            addr,
		ClientIdleConnTimeout: 10 * time.Second,
		ContestantLogger:      contestantLogger,
	}, contestantLogger)
	w := world.NewWorld(30*time.Millisecond, completedRequestChan, worldClient)

	worldCtx := world.NewContext(w)

	paymentServer := payment.NewServer(w.PaymentDB, 30*time.Millisecond, 5)
	go func() {
		http.ListenAndServe(":12345", paymentServer)
	}()

	usersAttributeSets := map[world.UserState]attribute.Set{
		world.UserStateInactive:                  attribute.NewSet(attribute.Int("state", int(world.UserStateInactive))),
		world.UserStateActive:                    attribute.NewSet(attribute.Int("state", int(world.UserStateActive))),
		world.UserStatePaymentMethodsNotRegister: attribute.NewSet(attribute.Int("state", int(world.UserStatePaymentMethodsNotRegister))),
	}
	requestsAttributeSets := map[world.RequestStatus]attribute.Set{
		world.RequestStatusMatching:    attribute.NewSet(attribute.Int("status", int(world.RequestStatusMatching))),
		world.RequestStatusDispatching: attribute.NewSet(attribute.Int("status", int(world.RequestStatusDispatching))),
		world.RequestStatusDispatched:  attribute.NewSet(attribute.Int("status", int(world.RequestStatusDispatched))),
		world.RequestStatusCarrying:    attribute.NewSet(attribute.Int("status", int(world.RequestStatusCarrying))),
		world.RequestStatusArrived:     attribute.NewSet(attribute.Int("status", int(world.RequestStatusArrived))),
		world.RequestStatusCompleted:   attribute.NewSet(attribute.Int("status", int(world.RequestStatusCompleted))),
		world.RequestStatusCanceled:    attribute.NewSet(attribute.Int("status", int(world.RequestStatusCanceled))),
	}

	lo.Must1(meter.Int64ObservableCounter("world.time", metric.WithDescription("Time"), metric.WithUnit("1"), metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
		o.Observe(w.Time)
		return nil
	})))
	lo.Must1(meter.Int64ObservableCounter("world.timeout", metric.WithDescription("Timeout"), metric.WithUnit("1"), metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
		o.Observe(int64(w.TimeoutTickCount))
		return nil
	})))
	lo.Must1(meter.Int64ObservableGauge("world.users.num", metric.WithDescription("Number of users"), metric.WithUnit("1"), metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
		for _, r := range w.Regions {
			counts := lo.CountValuesBy(r.UsersDB.ToSlice(), func(u *world.User) world.UserState { return u.State })
			for state, set := range usersAttributeSets {
				o.Observe(int64(counts[state]), metric.WithAttributeSet(set), metric.WithAttributes(attribute.String("region", r.Name)))
			}
		}
		return nil
	})))
	lo.Must1(meter.Int64ObservableGauge("world.chairs.num", metric.WithDescription("Number of chairs"), metric.WithUnit("1"), metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
		for _, p := range w.ProviderDB.Iter() {
			chairs := p.ChairDB.ToSlice()
			insideRegion := lo.CountBy(chairs, func(c *world.Chair) bool { return c.Current.Within(p.Region) })
			o.Observe(int64(insideRegion), metric.WithAttributes(attribute.Int("provider", int(p.ID)), attribute.String("region", p.Region.Name), attribute.Bool("inside_region", true)))
			o.Observe(int64(len(chairs)-insideRegion), metric.WithAttributes(attribute.Int("provider", int(p.ID)), attribute.String("region", p.Region.Name), attribute.Bool("inside_region", false)))
		}
		return nil
	})))
	lo.Must1(meter.Int64ObservableCounter("world.providers.num", metric.WithDescription("Number of providers"), metric.WithUnit("1"), metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
		o.Observe(int64(w.ProviderDB.Size()))
		return nil
	})))
	lo.Must1(meter.Int64ObservableCounter("world.providers.sales", metric.WithDescription("Sales of provider"), metric.WithUnit("1"), metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
		for _, p := range w.ProviderDB.Iter() {
			o.Observe(p.TotalSales.Load(), metric.WithAttributes(attribute.Int("provider", int(p.ID)), attribute.String("region", p.Region.Name)))
		}
		return nil
	})))
	lo.Must1(meter.Int64ObservableGauge("world.requests.num", metric.WithDescription("Number of requests"), metric.WithUnit("1"), metric.WithInt64Callback(func(ctx context.Context, o metric.Int64Observer) error {
		counts := lo.CountValuesBy(w.RequestDB.ToSlice(), func(r *world.Request) world.RequestStatus { return r.Statuses.Desired })
		for status, set := range requestsAttributeSets {
			o.Observe(int64(counts[status]), metric.WithAttributeSet(set))
		}
		return nil
	})))
	requestsRecorder := lo.Must1(meter.Int64Counter("world.requests.evaluations", metric.WithDescription("Counter of request's evaluations"), metric.WithUnit("1")))
	matchingLatency := lo.Must1(meter.Int64Histogram("world.request.matching_latency", metric.WithDescription("Histogram of matching latency"), metric.WithUnit("1")))
	dispatchingLatency := lo.Must1(meter.Int64Histogram("world.request.dispatching_latency", metric.WithDescription("Histogram of dispatching latency"), metric.WithUnit("1")))
	carryingLatency := lo.Must1(meter.Int64Histogram("world.request.carrying_latency", metric.WithDescription("Histogram of carrying latency"), metric.WithUnit("1")))

	go func() {
		for req := range completedRequestChan {
			eval := req.CalculateEvaluation()
			intervals := req.Intervals()
			contestantLogger.Info("request completed", zap.Stringer("request", req), zap.Stringer("eval", eval))
			requestsRecorder.Add(context.Background(), 1, metric.WithAttributes(attribute.Int("score", eval.Score()), attribute.Bool("matching", eval.Matching), attribute.Bool("dispatch", eval.Dispatch), attribute.Bool("pickup", eval.Pickup), attribute.Bool("drive", eval.Drive)))
			matchingLatency.Record(context.Background(), intervals[0])
			dispatchingLatency.Record(context.Background(), intervals[1])
			carryingLatency.Record(context.Background(), intervals[2])
		}
	}()

	return &Scenario{
		target:           target,
		addr:             addr,
		paymentURL:       paymentURL,
		contestantLogger: contestantLogger,
		world:            w,
		worldCtx:         worldCtx,
		paymentServer:    paymentServer,
		reporter:         reporter,
		meter:            meter,

		completedRequestChan: completedRequestChan,
	}
}

// Prepare はシナリオの初期化処理を行う
func (s *Scenario) Prepare(ctx context.Context, step *isucandar.BenchmarkStep) error {
	client, err := webapp.NewClient(webapp.ClientConfig{
		TargetBaseURL:         s.target,
		TargetAddr:            s.addr,
		ClientIdleConnTimeout: 10 * time.Second,
		ContestantLogger:      s.contestantLogger,
	})
	if err != nil {
		return err
	}

	_, err = client.PostInitialize(ctx, &api.PostInitializeReq{PaymentServer: s.paymentURL})
	if err != nil {
		return err
	}

	const (
		initialProvidersNum         = 5
		initialChairsNumPerProvider = 10
		initialUsersNum             = 10
	)

	for i := range initialProvidersNum {
		provider, err := s.world.CreateProvider(s.worldCtx, &world.CreateProviderArgs{
			Region: s.world.Regions[i%len(s.world.Regions)],
		})
		if err != nil {
			return err
		}

		for range initialChairsNumPerProvider {
			_, err := s.world.CreateChair(s.worldCtx, &world.CreateChairArgs{
				Provider:          provider,
				InitialCoordinate: world.RandomCoordinateOnRegionWithRand(provider.Region, provider.Rand),
				WorkTime:          world.NewInterval(world.ConvertHour(0), world.ConvertHour(2000)),
			})
			if err != nil {
				return err
			}
		}
	}
	for i := range initialUsersNum {
		_, err := s.world.CreateUser(s.worldCtx, &world.CreateUserArgs{Region: s.world.Regions[i%len(s.world.Regions)]})
		if err != nil {
			return err
		}
	}

	go func() {
		ticker := time.NewTicker(3 * time.Second)
		for {
			select {
			case <-ticker.C:
				if err := sendResult(s, false, false); err != nil {
					// TODO: エラーをadmin側に出力する
				}
			case <-ctx.Done():
				ticker.Stop()
			}
		}
	}()

	return nil
}

// Load はシナリオのメイン処理を行う
func (s *Scenario) Load(ctx context.Context, step *isucandar.BenchmarkStep) error {
	s.world.RestTicker()
LOOP:
	for {
		select {
		case <-ctx.Done():
			// 負荷走行終了
			break LOOP

		default:
			err := s.world.Tick(s.worldCtx)
			if err != nil {
				s.contestantLogger.Error("critical error", zap.Error(err))
				return err
			}

			if s.world.Time%world.LengthOfHour == 0 {
				s.contestantLogger.Info("tick",
					zap.Int64("ticks", s.world.Time),
					zap.Int("timeouts", s.world.TimeoutTickCount),
					zap.Float64("timeouts(%)", float64(s.world.TimeoutTickCount)/float64(s.world.Time)*100),
				)
			}
		}
	}

	return nil
}

// Validation はシナリオの結果検証処理を行う
func (s *Scenario) Validation(ctx context.Context, step *isucandar.BenchmarkStep) error {
	for _, region := range s.world.Regions {
		s.contestantLogger.Info("final region result",
			zap.String("region", region.Name),
			zap.Int("users", region.UsersDB.Len()),
			zap.Int("active_users", len(lo.Filter(region.UsersDB.ToSlice(), func(u *world.User, _ int) bool { return u.State == world.UserStateActive }))),
			zap.Int("score", region.UserSatisfactionScore()),
		)
	}
	for id, provider := range s.world.ProviderDB.Iter() {
		s.contestantLogger.Info("final provider result",
			zap.Int("id", int(id)),
			zap.String("region", provider.Region.Name),
			zap.Int64("total_sales", provider.TotalSales.Load()),
			zap.Int("chairs", provider.ChairDB.Len()),
			zap.Int("chairs_outside_region", lo.CountBy(provider.ChairDB.ToSlice(), func(c *world.Chair) bool { return !c.Current.Within(provider.Region) })),
		)
	}
	return sendResult(s, true, true)
}

func sendResult(s *Scenario, finished bool, passed bool) error {
	rawScore := lo.SumBy(s.world.ProviderDB.ToSlice(), func(p *world.Provider) int64 { return p.TotalSales.Load() })
	if err := s.reporter.Report(&resources.BenchmarkResult{
		Finished: finished,
		Passed:   passed,
		Score:    rawScore,
		ScoreBreakdown: &resources.BenchmarkResult_ScoreBreakdown{
			Raw:       rawScore,
			Deduction: 0,
		},
		// Reason以外はsupervisorが設定する
		Execution: &resources.BenchmarkResult_Execution{
			Reason: "実行終了",
		},
	}); err != nil {
		return err
	}

	return nil
}
