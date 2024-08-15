package cmd

import (
	"os"

	"github.com/isucon/isucon14/bench/internal/logger"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:     "bench",
	Short:   "ISUCON14 benchmarker",
	Version: version,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		logger.SetupGlobalLogger()
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
