package scenario

import (
	"context"
	"fmt"
	"time"

	"github.com/isucon/isucandar"
	"go.uber.org/zap"
	"golang.org/x/exp/constraints"

	// "github.com/isucon/isucon14/bench/benchmarker/scenario/agents/verify"
	"github.com/isucon/isucon14/bench/benchmarker/scenario/worldclient"
	"github.com/isucon/isucon14/bench/benchmarker/webapp"
	"github.com/isucon/isucon14/bench/benchmarker/world"
	"github.com/isucon/isucon14/bench/internal/concurrent"
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
	contestantLogger *zap.Logger
	world            *world.World
	worldCtx         *world.Context

	requestQueue                 chan string // あんまり考えて導入してないです
	chairNotificationReceiverMap *concurrent.SimpleMap[string, world.NotificationReceiverFunc]
}

func NewScenario(target string, contestantLogger *zap.Logger) *Scenario {
	chairNotificationReceiverMap := concurrent.NewSimpleMap[string, world.NotificationReceiverFunc]()
	w := world.NewWorld()
	worldClient := worldclient.NewWorldClient(context.Background(), w, webapp.ClientConfig{
		TargetBaseURL:         target,
		DefaultClientTimeout:  5 * time.Second,
		ClientIdleConnTimeout: 10 * time.Second,
		InsecureSkipVerify:    true,
		ContestantLogger:      contestantLogger,
	}, chairNotificationReceiverMap)
	worldCtx := world.NewContext(w, worldClient)

	return &Scenario{
		target:           target,
		contestantLogger: contestantLogger,
		world:            w,
		worldCtx:         worldCtx,

		requestQueue:                 make(chan string, 1000),
		chairNotificationReceiverMap: chairNotificationReceiverMap,
	}
}

// Prepare はシナリオの初期化処理を行う
func (s *Scenario) Prepare(ctx context.Context, step *isucandar.BenchmarkStep) error {
	client, err := webapp.NewClient(webapp.ClientConfig{
		TargetBaseURL:         s.target,
		DefaultClientTimeout:  5 * time.Second,
		ClientIdleConnTimeout: 10 * time.Second,
		InsecureSkipVerify:    true,
		ContestantLogger:      s.contestantLogger,
	})
	if err != nil {
		return err
	}

	_, err = client.PostInitialize(ctx)
	if err != nil {
		return err
	}

	return nil
}

// convertHour h時間を仮想世界時間に変換する
func convertHour[T constraints.Integer](h T) T {
	return h * world.LengthOfHour
}

// Load はシナリオのメイン処理を行う
func (s *Scenario) Load(ctx context.Context, step *isucandar.BenchmarkStep) error {
	// agent, err := verify.NewAgent(s.target, s.contestantLogger)
	// if err != nil {
	// 	s.contestantLogger.Error("Failed to create agent", zap.Error(err))
	// 	return err
	// }

	// if err := agent.Run(); err != nil {
	// 	s.contestantLogger.Error("Failed to run agent", zap.Error(err))
	// 	return err
	// }
	//w, err := worker.NewWorker(func(ctx context.Context, _ int) {
	//	agent, err := verify.NewAgent(s.target, s.contestantLogger)
	//	if err != nil {
	//		s.contestantLogger.Error("Failed to create agent", zap.Error(err))
	//		return
	//	}
	//
	//	if err := agent.Run(); err != nil {
	//		s.contestantLogger.Error("Failed to run agent", zap.Error(err))
	//	}
	//}, worker.WithMaxParallelism(10))
	//if err != nil {
	//	return err
	//}
	//
	//w.Process(ctx)

	region := s.world.Regions[1]
	for range 10 {
		chair, err := s.world.CreateChair(s.worldCtx, &world.CreateChairArgs{
			Region:            region,
			InitialCoordinate: world.RandomCoordinateOnRegion(region),
			WorkTime:          world.NewInterval(convertHour(0), convertHour(23)),
		})
		s.contestantLogger.Info("CreateChair", zap.Any("chair", chair))
		if err != nil {
			return err
		}
	}
	for range 20 {
		u, err := s.world.CreateUser(s.worldCtx, &world.CreateUserArgs{Region: region})
		if err != nil {
			return err
		}
		u.State = world.UserStateActive
	}

	go func() {
		for id := range s.requestQueue {
			matched := false
			for _, chair := range s.world.ChairDB.Iter() {
				if chair.State == world.ChairStateActive && !chair.ServerRequestID.Valid {
					if f, ok := s.chairNotificationReceiverMap.Get(chair.ServerID); ok {
						f(world.ChairNotificationEventMatched, fmt.Sprintf(`{"id":"%s"}`, id))
					}
					matched = true
					break
				}
			}
			if !matched {
				s.requestQueue <- id
			}
		}
	}()

	for range convertHour(24 * 3) {
		s.world.Tick(s.worldCtx)
	}

	for _, u := range s.world.UserDB.Iter() {
		s.contestantLogger.Info("User", zap.Any("user", u))
	}
	sales := 0
	for _, req := range s.world.RequestDB.Iter() {
		s.contestantLogger.Info("Request", zap.Any("request", req))
		if req.DesiredStatus == world.RequestStatusCompleted {
			sales += req.Fare()
		}
	}

	s.contestantLogger.Info("Sales", zap.Int("sales", sales))

	return nil
}

// Validation はシナリオの結果検証処理を行う
func (s *Scenario) Validation(ctx context.Context, step *isucandar.BenchmarkStep) error {
	return nil
}
