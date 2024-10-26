package webapp

import (
	"context"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/isucon/isucandar/agent"
)

type Client struct {
	agent            *agent.Agent
	requestModifiers []func(*http.Request)
}

type ClientConfig struct {
	TargetBaseURL         string
	TargetAddr            string
	ClientIdleConnTimeout time.Duration
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
		agent: ag,
	}, nil
}

func (c *Client) AddRequestModifier(modifier func(*http.Request)) {
	c.requestModifiers = append(c.requestModifiers, modifier)
}

func (c *Client) SetCookie(cookie *http.Cookie) {
	c.agent.HttpClient.Jar.SetCookies(c.agent.BaseURL, []*http.Cookie{cookie})
}

func closeBody(resp *http.Response) {
	if resp.Body != nil {
		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
	}
}
