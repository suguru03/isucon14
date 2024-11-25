package world

import (
	"math/rand/v2"
	"slices"

	"github.com/samber/lo"
)

type ChairModel struct {
	Name  string
	Speed int
}

type ChairModels []*ChairModel

func (arr ChairModels) Random() *ChairModel {
	return arr[rand.IntN(len(arr))]
}

var (
	modelNamesBySpeed = map[int][]string{
		2: {
			"リラックスシート NEO",
			"エアシェル ライト",
			"チェアエース S",
			"ベーシックスツール プラス",
			"SitEase",
			"スピンフレーム 01",
			"LiteLine",
			"リラックス座",
			"EasySit",
			"ComfortBasic",
		},
		3: {
			"フォームライン RX",
			"StyleSit",
			"エルゴクレスト II",
			"クエストチェア Lite",
			"AeroSeat",
			"エアフロー EZ",
			"ゲーミングシート NEXUS",
			"シェルシート ハイブリッド",
			"フレックスコンフォート PRO",
			"プレイスタイル Z",
			"ストリームギア S1",
			"リカーブチェア スマート",
			"ErgoFlex",
			"BalancePro",
			"風雅（ふうが）チェア",
		},
		5: {
			"ゼンバランス EX",
			"シャドウバースト M",
			"フューチャーチェア CORE",
			"プレミアムエアチェア ZETA",
			"プロゲーマーエッジ X1",
			"モーションチェア RISE",
			"雅楽座",
			"スリムライン GX",
			"Infinity Seat",
			"LuxeThrone",
			"Titanium Line",
			"ZenComfort",
			"アルティマシート X",
			"インペリアルクラフト LUXE",
			"ステルスシート ROGUE",
		},
		7: {
			"エコシート リジェネレイト",
			"フューチャーステップ VISION",
			"インフィニティ GEAR V",
			"オブシディアン PRIME",
			"ナイトシート ブラックエディション",
			"ShadowEdition",
			"Phoenix Ultra",
			"タイタンフレーム ULTRA",
			"Legacy Chair",
			"ルミナスエアクラウン",
			"ヴァーチェア SUPREME",
			"匠座 PRO LIMITED",
			"匠座（たくみざ）プレミアム",
			"ゼノバース ALPHA",
			"Aurora Glow",
		},
	}
	modelsBySpeed = lo.MapValues(modelNamesBySpeed, func(names []string, speed int) ChairModels {
		return lo.Map(names, func(name string, _ int) *ChairModel {
			return &ChairModel{Name: name, Speed: speed}
		})
	})
	modelSpeeds = lo.Keys(modelNamesBySpeed)
)

func PickModels() map[int]ChairModels {
	result := map[int]ChairModels{}
	for speed, models := range modelsBySpeed {
		result[speed] = lo.Shuffle(slices.Clone(models))[:3]
	}
	return result
}
