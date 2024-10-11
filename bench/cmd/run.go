package cmd

import (
	"context"
	"fmt"
	"time"

	"github.com/isucon/isucandar"
	"github.com/spf13/cobra"
	"go.uber.org/zap"

	"github.com/isucon/isucon14/bench/benchmarker/metrics"
	"github.com/isucon/isucon14/bench/benchmarker/scenario"
	"github.com/isucon/isucon14/bench/benchrun"
	"github.com/isucon/isucon14/bench/internal/logger"
)

var (
	// ベンチマークターゲット(URL)
	targetURL string
	// ベンチマークターゲット(ip:port)
	targetAddr string
	// ペイメントサーバのURL
	paymentURL string
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

		// supervisorで起動された場合は、targetを上書きする
		if benchrun.GetTargetAddress() != "" {
			targetURL = "https://trial.isucon14.net"
			targetAddr = fmt.Sprintf("%s:%d", benchrun.GetTargetAddress(), 443)
		}

		var reporter benchrun.Reporter
		if fd, err := benchrun.GetReportFD(); err != nil {
			reporter = &benchrun.NullReporter{}
		} else {
			if reporter, err = benchrun.NewFDReporter(fd); err != nil {
				l.Error("Failed to create reporter", zap.Error(err))
				return err
			}
		}

		meter, exporter, err := metrics.NewMeter(cmd.Context())
		if err != nil {
			l.Error("Failed to create meter", zap.Error(err))
			return err
		}
		defer exporter.Shutdown(context.Background())

		s := scenario.NewScenario(targetURL, targetAddr, paymentURL, contestantLogger, reporter, meter)

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
		result.Score.Set("completed_request", 1)

		errors := result.Errors.All()
		for _, err := range errors {
			l.Error("benchmark error", zap.Error(err))
		}

		for scoreTag, count := range result.Score.Breakdown() {
			l.Info("score", zap.String("tag", string(scoreTag)), zap.Int64("count", count))
		}

		l.Info("benchmark finished", zap.Int64("score", result.Score.Total()))
		return nil
	},
}

func init() {
	runCmd.Flags().StringVar(&targetURL, "target", "http://localhost:8080", "benchmark target url")
	runCmd.Flags().StringVar(&targetAddr, "addr", "", "benchmark target ip:port")
	runCmd.Flags().StringVar(&paymentURL, "payment-url", "http://localhost:12345", "payment server URL")
	runCmd.Flags().Int64VarP(&loadTimeoutSeconds, "load-timeout", "t", 60, "load timeout in seconds")
	rootCmd.AddCommand(runCmd)
}
