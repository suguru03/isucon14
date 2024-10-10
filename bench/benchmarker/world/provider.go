package world

import (
	"fmt"
	"math/rand/v2"
	"sync/atomic"
)

type ProviderID int

type Provider struct {
	// ID ベンチマーカー内部プロバイダーID
	ID ProviderID
	// ServerID サーバー上でのプロバイダーID
	ServerID string

	// RegisteredData サーバーに登録されているプロバイダー情報
	RegisteredData RegisteredProviderData
	// AccessToken サーバーアクセストークン
	AccessToken string

	// Rand 専用の乱数
	Rand *rand.Rand
	// tickDone 行動が完了しているかどうか
	tickDone atomic.Bool
}

type RegisteredProviderData struct {
	Name string
}

func (c *Provider) String() string {
	return fmt.Sprintf("Provider{id=%d}", c.ID)
}

func (c *Provider) SetID(id ProviderID) {
	c.ID = id
}
