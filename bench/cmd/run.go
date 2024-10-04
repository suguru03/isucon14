package cmd

import (
	"context"
	"time"

	"github.com/isucon/isucandar"
	"github.com/spf13/cobra"
	"go.uber.org/zap"

	"github.com/isucon/isucon14/bench/benchmarker/scenario"
	"github.com/isucon/isucon14/bench/internal/logger"
)

var (
	// ベンチマークターゲット
	target string
	// 負荷走行秒数
	loadTimeoutSeconds int64
)

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Run a benchmark",
	RunE: func(cmd *cobra.Command, args []string) error {
		l := zap.L()
		defer l.Sync()

		contestantLogger, err := logger.CreateContestantLogger()
		if err != nil {
			l.Error("Failed to create contestant logger", zap.Error(err))
			return err
		}

		s := scenario.NewScenario(target, contestantLogger)

		b, err := isucandar.NewBenchmark(
			isucandar.WithoutPanicRecover(),
			isucandar.WithLoadTimeout(time.Duration(loadTimeoutSeconds)*time.Second),
		)
		if err != nil {
			l.Error("Failed to create benchmark", zap.Error(err))
			return err
		}
		b.AddScenario(s)

		l.Info("benchmark started")
		result := b.Start(context.Background())
		result.Score.Set("ping", 1)

		errors := result.Errors.All()
		for _, err := range errors {
			l.Error("benchmark error", zap.Error(err))
		}

		l.Info("benchmark finished", zap.Int64("score", result.Score.Total()))
		return nil
	},
}

func init() {
	runCmd.Flags().StringVar(&target, "target", "http://localhost:8080", "benchmark target")
	runCmd.Flags().Int64VarP(&loadTimeoutSeconds, "load-timeout", "t", 60, "load timeout in seconds")
	rootCmd.AddCommand(runCmd)
}
