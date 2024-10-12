package webapp

import (
	"context"
	"net"
	"net/http"
	"time"

	"github.com/isucon/isucandar/agent"
	"go.uber.org/zap"
)

type Client struct {
	agent *agent.Agent

	contestantLogger *zap.Logger

	requestModifiers []func(*http.Request)
}

type ClientConfig struct {
	TargetBaseURL         string
	TargetAddr            string
	ClientIdleConnTimeout time.Duration
	ContestantLogger      *zap.Logger
}

func NewClient(config ClientConfig) (*Client, error) {
	trs := agent.DefaultTransport.Clone()
	trs.IdleConnTimeout = config.ClientIdleConnTimeout
	if len(config.TargetAddr) > 0 {
		trs.DialContext = func(ctx context.Context, network, _ string) (net.Conn, error) {
			d := net.Dialer{}
			return d.DialContext(ctx, network, config.TargetAddr)
		}
		trs.Dial = func(network, addr string) (net.Conn, error) {
			return trs.DialContext(context.Background(), network, config.TargetAddr)
		}
	}
	ag, err := agent.NewAgent(
		agent.WithBaseURL(config.TargetBaseURL),
		agent.WithTimeout(10*time.Second),
		agent.WithNoCache(),
		agent.WithTransport(trs),
	)
	if err != nil {
		return nil, err
	}

	return &Client{
		agent:            ag,
		contestantLogger: config.ContestantLogger,
	}, nil
}

func (c *Client) AddRequestModifier(modifier func(*http.Request)) {
	c.requestModifiers = append(c.requestModifiers, modifier)
}
