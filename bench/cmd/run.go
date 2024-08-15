package cmd

import (
	"context"
	"time"

	"github.com/isucon/isucandar"
	"github.com/isucon/isucandar/worker"
	"github.com/isucon/isucon14/bench/benchmarker/webapp"
	"github.com/isucon/isucon14/bench/internal/logger"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
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

		b, err := isucandar.NewBenchmark(
			isucandar.WithoutPanicRecover(),
			isucandar.WithLoadTimeout(time.Duration(loadTimeoutSeconds)*time.Second),
		)
		if err != nil {
			l.Error("Failed to create benchmark", zap.Error(err))
			return err
		}

		b.Prepare(func(ctx context.Context, step *isucandar.BenchmarkStep) error {
			client, err := webapp.NewClient(webapp.ClientConfig{
				TargetBaseURL:         target,
				DefaultClientTimeout:  5 * time.Second,
				ClientIdleConnTimeout: 10 * time.Second,
				InsecureSkipVerify:    true,
				ContestantLogger:      contestantLogger,
			})
			if err != nil {
				return err
			}

			_, err = client.PostInitialize(ctx)
			if err != nil {
				return err
			}

			return nil
		})
		b.Load(func(ctx context.Context, step *isucandar.BenchmarkStep) error {
			client, err := webapp.NewClient(webapp.ClientConfig{
				TargetBaseURL:         target,
				DefaultClientTimeout:  5 * time.Second,
				ClientIdleConnTimeout: 10 * time.Second,
				InsecureSkipVerify:    true,
				ContestantLogger:      contestantLogger,
			})
			if err != nil {
				return err
			}

			w, err := worker.NewWorker(func(ctx context.Context, _ int) {
				err = client.GetPing(ctx)
				if err != nil {
					step.AddError(err)
					return
				}
				step.AddScore("ping")
			}, worker.WithMaxParallelism(10))
			w.Process(ctx)

			return nil
		})

		l.Info("benchmark started")
		result := b.Start(context.Background())
		result.Score.Set("ping", 1)

		l.Info("benchmark finished", zap.Int64("score", result.Score.Total()))
		return nil
	},
}

func init() {
	runCmd.Flags().StringVar(&target, "target", "http://localhost:8080", "benchmark target")
	runCmd.Flags().Int64VarP(&loadTimeoutSeconds, "load-timeout", "t", 60, "load timeout in seconds")
	rootCmd.AddCommand(runCmd)
}
