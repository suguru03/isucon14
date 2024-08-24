package logger

import (
	"go.uber.org/zap"
)

func SetupGlobalLogger() *zap.Logger {
	l, _ := zap.NewProduction()

	zap.ReplaceGlobals(l)
	return l
}

func CreateContestantLogger() (*zap.Logger, error) {
	l, err := zap.NewProduction()
	return l, err
}
