package scenario

import (
	"embed"
	"encoding/json"

	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
)

//go:embed data/*
var data embed.FS

type ValidateData struct {
	// 01JDFEDF00B09BNMV8MP0RB34G,匠椅子製作所,0811617de5c97aea5ddb433f085c3d1e,cd8a581e44c8cc269ce9f1484b96f534,2024-11-24 16:00:00.000000,2024-11-24 16:00:00.000000
	Owner01JDFEDF00B09BNMV8MP0RB34G struct {
		Sales                             api.OwnerGetSalesOK
		Sales1732579200000to1732622400000 api.OwnerGetSalesOK
		Chairs                            api.OwnerGetChairsOK
	}
	// 01JDM0N9W89PK57C7XEVGD5C80,Runolfsdottir6120,冬深,宇野,1978-01-20,21e9562de048ee9b34da840296509fa9,775a18ee413f42d,2024-11-26 10:35:49.000000,2024-11-26 10:35:49.000000
	User01JDM0N9W89PK57C7XEVGD5C80 struct {
		Rides api.AppGetRidesOK
	}
	// 01JDK5EFNGT8ZHMTQXQ4BNH8NQ,Block5589,良太,森田,1963-12-10,c9e15fd57545f43105ace9088f1c467e,04d0b8f306231f6,2024-11-26 02:40:14.000000,2024-11-26 02:40:14.000000
	User01JDK5EFNGT8ZHMTQXQ4BNH8NQ struct {
		Rides            api.AppGetRidesOK
		Estimated_3_10   api.AppPostRidesEstimatedFareOK
		Estimated_m11_10 api.AppPostRidesEstimatedFareOK
	}
	// 01JDJ4XN10E2CRZ37RNZ5GAFW6,Sauer4603,宇里,早川,1961-04-06,a8b21d78f143c3facdece4dffba964cc,e9620e1cf137d53,2024-11-25 17:11:48.000000,2024-11-25 17:11:48.000000
	User01JDJ4XN10E2CRZ37RNZ5GAFW6 struct {
		Rides            api.AppGetRidesOK
		Estimated_3_10   api.AppPostRidesEstimatedFareOK
		Estimated_m11_10 api.AppPostRidesEstimatedFareOK
	}
}

func LoadData() *ValidateData {
	result := ValidateData{}
	{
		f, err := data.Open("data/owner/01JDFEDF00B09BNMV8MP0RB34G/sales.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.Owner01JDFEDF00B09BNMV8MP0RB34G.Sales); err != nil {
			panic(err)
		}
	}
	{
		f, err := data.Open("data/owner/01JDFEDF00B09BNMV8MP0RB34G/sales_1732579200000_1732622400000.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.Owner01JDFEDF00B09BNMV8MP0RB34G.Sales1732579200000to1732622400000); err != nil {
			panic(err)
		}
	}
	{
		f, err := data.Open("data/owner/01JDFEDF00B09BNMV8MP0RB34G/chairs.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.Owner01JDFEDF00B09BNMV8MP0RB34G.Chairs); err != nil {
			panic(err)
		}
	}
	{
		f, err := data.Open("data/user/01JDM0N9W89PK57C7XEVGD5C80/rides.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.User01JDM0N9W89PK57C7XEVGD5C80.Rides); err != nil {
			panic(err)
		}
	}
	{
		f, err := data.Open("data/user/01JDK5EFNGT8ZHMTQXQ4BNH8NQ/rides.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.User01JDK5EFNGT8ZHMTQXQ4BNH8NQ.Rides); err != nil {
			panic(err)
		}
	}
	{
		f, err := data.Open("data/user/01JDK5EFNGT8ZHMTQXQ4BNH8NQ/estimated_3_10.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.User01JDK5EFNGT8ZHMTQXQ4BNH8NQ.Estimated_3_10); err != nil {
			panic(err)
		}
	}
	{
		f, err := data.Open("data/user/01JDK5EFNGT8ZHMTQXQ4BNH8NQ/estimated_-11_10.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.User01JDK5EFNGT8ZHMTQXQ4BNH8NQ.Estimated_m11_10); err != nil {
			panic(err)
		}
	}
	{
		f, err := data.Open("data/user/01JDJ4XN10E2CRZ37RNZ5GAFW6/rides.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.User01JDJ4XN10E2CRZ37RNZ5GAFW6.Rides); err != nil {
			panic(err)
		}
	}
	{
		f, err := data.Open("data/user/01JDJ4XN10E2CRZ37RNZ5GAFW6/estimated_3_10.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.User01JDJ4XN10E2CRZ37RNZ5GAFW6.Estimated_3_10); err != nil {
			panic(err)
		}
	}
	{
		f, err := data.Open("data/user/01JDJ4XN10E2CRZ37RNZ5GAFW6/estimated_-11_10.json")
		if err != nil {
			panic(err)
		}
		if err := json.NewDecoder(f).Decode(&result.User01JDJ4XN10E2CRZ37RNZ5GAFW6.Estimated_m11_10); err != nil {
			panic(err)
		}
	}
	return &result
}
