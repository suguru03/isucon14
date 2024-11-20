package scenario

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/isucon/isucon14/bench/benchmarker/webapp"
	"github.com/isucon/isucon14/bench/benchmarker/webapp/api"
)

// 実装の検証を行う (一旦は正常系のみをテストする)
func (s *Scenario) prevalidation(ctx context.Context, client *webapp.Client) error {
	_, err := client.PostInitialize(ctx, &api.PostInitializeReq{PaymentServer: s.paymentURL})
	if err != nil {
		return err
	}

	clientConfig := webapp.ClientConfig{
		TargetBaseURL:         s.target,
		TargetAddr:            s.addr,
		ClientIdleConnTimeout: 10 * time.Second,
	}

	if err := validateSuccessFlow(ctx, clientConfig); err != nil {
		return err
	}

	return nil
}

func validateSuccessFlow(ctx context.Context, clientConfig webapp.ClientConfig) error {
	userClient, err := webapp.NewClient(clientConfig)
	if err != nil {
		return err
	}
	ownerClient, err := webapp.NewClient(clientConfig)
	if err != nil {
		return err
	}
	chairClient, err := webapp.NewClient(clientConfig)
	if err != nil {
		return err
	}

	userID := ""
	// POST /api/app/register
	{
		result, err := userClient.AppPostRegister(ctx, &api.AppPostUsersReq{
			Username:    "hoge",
			Firstname:   "hoge",
			Lastname:    "hoge",
			DateOfBirth: "2000-01-01",
		})
		if err != nil {
			return err
		}
		if result.ID == "" {
			return errors.New("POST /api/app/register の返却するIDは、空であってはいけません")
		}
		userID = result.ID
	}

	paymentToken := "token"
	// POST /api/app/payment-methods
	{
		_, err := userClient.AppPostPaymentMethods(ctx, &api.AppPostPaymentMethodsReq{
			Token: paymentToken,
		})
		if err != nil {
			return err
		}
	}

	// POST /api/app/requests
	requestID := ""
	{
		result, err := userClient.AppPostRequest(ctx, &api.AppPostRidesReq{
			PickupCoordinate: api.Coordinate{
				Latitude:  0,
				Longitude: 0,
			},
			DestinationCoordinate: api.Coordinate{
				Latitude:  10,
				Longitude: 10,
			},
		})
		if err != nil {
			return err
		}
		if result.RideID == "" {
			return errors.New("POST /api/app/requests の返却するIDは、空であってはいけません")
		}
		requestID = result.RideID
	}

	// GET /api/app/requests/:requestID
	{
		result, err := userClient.AppGetRequest(ctx, requestID)
		if err != nil {
			return err
		}
		if result.ID != requestID {
			return fmt.Errorf("GET /api/app/requests/:requestID の返却するIDが、リクエストIDと一致しません (expected:%s, actual:%s)", requestID, result.ID)
		}
		if result.PickupCoordinate.Latitude != 0 {
			return fmt.Errorf("GET /api/app/requests/:requestID の返却するpickup_coordinateのlatitudeが正しくありません (expected:%d, actual:%d)", 0, result.PickupCoordinate.Latitude)
		}
		if result.PickupCoordinate.Longitude != 0 {
			return fmt.Errorf("GET /api/app/requests/:requestID の返却するpickup_coordinateのlongitudeが正しくありません (expected:%d, actual:%d)", 0, result.PickupCoordinate.Longitude)
		}
		if result.DestinationCoordinate.Latitude != 10 {
			return fmt.Errorf("GET /api/app/requests/:requestID の返却するdestination_coordinateのlatitudeが正しくありません (expected:%d, actual:%d)", 10, result.DestinationCoordinate.Latitude)
		}
		if result.DestinationCoordinate.Longitude != 10 {
			return fmt.Errorf("GET /api/app/requests/:requestID の返却するdestination_coordinateのlongitudeが正しくありません (expected:%d, actual:%d)", 10, result.DestinationCoordinate.Longitude)
		}
		if result.Status != "MATCHING" {
			return fmt.Errorf("GET /api/app/requests/:requestID の返却するstatusが正しくありません (expected:%s, actual:%s)", "MATCHING", result.Status)
		}
		if result.Chair.Set {
			return errors.New("GET /api/app/requests/:requestID の返却するchairがセットされているべきではありません")
		}
	}

	// GET /api/app/notifications
	{
		for result, err := range userClient.AppGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateAppNotification(result, requestID, api.RideStatusMATCHING); err != nil {
				return err
			}
			if result.Chair.Set {
				return errors.New("GET /api/app/requests/:requestID の返却するchairがセットされているべきではありません")
			}
			break
		}
	}

	// GET /api/app/nearby-chairs
	{
		result, err := userClient.AppGetNearbyChairs(ctx, &api.AppGetNearbyChairsParams{
			Latitude:  0,
			Longitude: 0,
		})
		if err != nil {
			return err
		}
		if len(result.Chairs) != 0 {
			return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairsの数が正しくありません (expected:%d, actual:%d)", 0, len(result.Chairs))
		}
	}

	chairRegisterToken := ""
	// POST /api/owner/register
	{
		result, err := ownerClient.ProviderPostRegister(ctx, &api.OwnerPostOwnersReq{
			Name: "hoge",
		})
		if err != nil {
			return err
		}
		if result.ID == "" {
			return errors.New("POST /api/owner/register の返却するIDは、空であってはいけません")
		}
		if result.ChairRegisterToken == "" {
			return errors.New("POST /api/owner/register の返却するchair_register_tokenは、空であってはいけません")
		}
		chairRegisterToken = result.ChairRegisterToken
	}

	chairID := ""
	// POST /api/chair/register
	{
		result, err := chairClient.ChairPostRegister(ctx, &api.ChairPostChairsReq{
			Name:               "hoge",
			Model:              "A",
			ChairRegisterToken: chairRegisterToken,
		})
		if err != nil {
			return err
		}
		if result.ID == "" {
			return errors.New("POST /api/chair/register の返却するIDは、空であってはいけません")
		}
		chairID = result.ID
	}

	// POST /api/chair/activate
	{
		_, err := chairClient.ChairPostActivity(ctx, &api.ChairPostActivityReq{
			IsActive: true,
		})
		if err != nil {
			return err
		}
	}

	// POST /api/chair/coordinate
	{
		_, err := chairClient.ChairPostCoordinate(ctx, &api.Coordinate{
			Latitude:  1,
			Longitude: 1,
		})
		if err != nil {
			return err
		}
	}

	// GET /api/chair/notification
	{
		for result, err := range chairClient.ChairGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateChairNotification(result, requestID, userID, api.RideStatusMATCHING); err != nil {
				return err
			}
			break
		}
	}

	// GET /api/app/notifications
	{
		for result, err := range userClient.AppGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateAppNotificationWithChair(result, requestID, api.RideStatusMATCHING, chairID); err != nil {
				return err
			}
			if len(result.Chair.Value.Stats.RecentRides) != 0 {
				return fmt.Errorf("GET /api/app/notification の返却するchair.stats.recent_ridesの数が正しくありません (expected:%d, actual:%d)", 0, len(result.Chair.Value.Stats.RecentRides))
			}
			break
		}
	}

	// POST /api/chair/requests/accept
	{
		_, err := chairClient.ChairPostRideStatus(ctx, requestID, &api.ChairPostRideStatusReq{
			Status: api.ChairPostRideStatusReqStatusENROUTE,
		})
		if err != nil {
			return err
		}
	}

	// GET /api/chair/notification
	{
		for result, err := range chairClient.ChairGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateChairNotification(result, requestID, userID, api.RideStatusENROUTE); err != nil {
				return err
			}
			break
		}
	}

	// GET /api/app/notifications
	{
		for result, err := range userClient.AppGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateAppNotificationWithChair(result, requestID, api.RideStatusENROUTE, chairID); err != nil {
				return err
			}
			if len(result.Chair.Value.Stats.RecentRides) != 0 {
				return fmt.Errorf("GET /api/app/notification の返却するchair.stats.recent_ridesの数が正しくありません (expected:%d, actual:%d)", 0, len(result.Chair.Value.Stats.RecentRides))
			}
			break
		}
	}

	// POST /api/chair/coordinate
	{
		_, err := chairClient.ChairPostCoordinate(ctx, &api.Coordinate{
			Latitude:  0,
			Longitude: 0,
		})
		if err != nil {
			return err
		}
	}

	// GET /api/chair/notification
	{
		for result, err := range chairClient.ChairGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateChairNotification(result, requestID, userID, api.RideStatusPICKUP); err != nil {
				return err
			}
			break
		}
	}

	// GET /api/app/notifications
	{
		for result, err := range userClient.AppGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateAppNotificationWithChair(result, requestID, api.RideStatusPICKUP, chairID); err != nil {
				return err
			}
			if len(result.Chair.Value.Stats.RecentRides) != 0 {
				return fmt.Errorf("GET /api/app/notification の返却するchair.stats.recent_ridesの数が正しくありません (expected:%d, actual:%d)", 0, len(result.Chair.Value.Stats.RecentRides))
			}
			break
		}
	}

	// POST /api/chair/requests/depart
	{
		_, err := chairClient.ChairPostRideStatus(ctx, requestID, &api.ChairPostRideStatusReq{
			Status: api.ChairPostRideStatusReqStatusCARRYING,
		})
		if err != nil {
			return err
		}
	}

	// GET /api/chair/notification
	{
		for result, err := range chairClient.ChairGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateChairNotification(result, requestID, userID, api.RideStatusCARRYING); err != nil {
				return err
			}
			break
		}
	}

	// GET /api/app/notifications
	{
		for result, err := range userClient.AppGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateAppNotificationWithChair(result, requestID, api.RideStatusCARRYING, chairID); err != nil {
				return err
			}
			if len(result.Chair.Value.Stats.RecentRides) != 0 {
				return fmt.Errorf("GET /api/app/notification の返却するchair.stats.recent_ridesの数が正しくありません (expected:%d, actual:%d)", 0, len(result.Chair.Value.Stats.RecentRides))
			}
			break
		}
	}

	// POST /api/chair/coordinate
	{
		_, err := chairClient.ChairPostCoordinate(ctx, &api.Coordinate{
			Latitude:  10,
			Longitude: 10,
		})
		if err != nil {
			return err
		}
	}

	// GET /api/chair/notification
	{
		for result, err := range chairClient.ChairGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateChairNotification(result, requestID, userID, api.RideStatusARRIVED); err != nil {
				return err
			}
			break
		}
	}

	// GET /api/app/notifications
	{
		for result, err := range userClient.AppGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateAppNotificationWithChair(result, requestID, api.RideStatusARRIVED, chairID); err != nil {
				return err
			}
			if len(result.Chair.Value.Stats.RecentRides) != 0 {
				return fmt.Errorf("GET /api/app/notification の返却するchair.stats.recent_ridesの数が正しくありません (expected:%d, actual:%d)", 0, len(result.Chair.Value.Stats.RecentRides))
			}
			break
		}
	}

	// POST /api/app/request/:requestID/evaluate
	{
		_, err := userClient.AppPostRequestEvaluate(ctx, requestID, &api.AppPostRideEvaluationReq{
			Evaluation: 5,
		})
		if err != nil {
			return err
		}
	}

	// GET /api/app/nearby-chairs
	{
		result, err := userClient.AppGetNearbyChairs(ctx, &api.AppGetNearbyChairsParams{
			Latitude:  0,
			Longitude: 0,
		})
		if err != nil {
			return err
		}
		if len(result.Chairs) != 1 {
			return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairsの数が正しくありません (expected:%d, actual:%d)", 1, len(result.Chairs))
		}
		if result.Chairs[0].ID != chairID {
			return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairのIDが正しくありません (expected:%s, actual:%s)", chairID, result.Chairs[0].ID)
		}
		if result.Chairs[0].Name != "hoge" {
			return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairのnameが正しくありません (expected:%s, actual:%s)", "hoge", result.Chairs[0].Name)
		}
		if result.Chairs[0].Model != "A" {
			return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairのmodelが正しくありません (expected:%s, actual:%s)", "A", result.Chairs[0].Model)
		}
		if len(result.Chairs[0].Stats.RecentRides) != 1 {
			return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairのstatsのrecent_ridesが正しくありません (expected:%d, actual:%d)", 1, len(result.Chairs[0].Stats.RecentRides))
		}
		if result.Chairs[0].Stats.TotalEvaluationAvg != 5 {
			return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairのstatsのtotal_evaluation_avgが正しくありません (expected:%f, actual:%f)", 5.0, result.Chairs[0].Stats.TotalEvaluationAvg)
		}
		if result.Chairs[0].Stats.TotalRidesCount != 1 {
			return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairのstatsのtotal_rides_countが正しくありません (expected:%d, actual:%d)", 1, result.Chairs[0].Stats.TotalRidesCount)
		}
	}

	// GET /api/app/notifications
	{
		for result, err := range userClient.AppGetNotification(ctx) {
			if err != nil {
				return err
			}
			if err := validateAppNotification(result, requestID, api.RideStatusCOMPLETED); err != nil {
				return err
			}
			if len(result.Chair.Value.Stats.RecentRides) != 1 {
				return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairのstatsのrecent_ridesが正しくありません (expected:%d, actual:%d)", 1, len(result.Chair.Value.Stats.RecentRides))
			}
			if result.Chair.Value.Stats.TotalEvaluationAvg != 5 {
				return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairのstatsのtotal_evaluation_avgが正しくありません (expected:%f, actual:%f)", 5.0, result.Chair.Value.Stats.TotalEvaluationAvg)
			}
			if result.Chair.Value.Stats.TotalRidesCount != 1 {
				return fmt.Errorf("GET /api/app/nearby-chairs の返却するchairのstatsのtotal_rides_countが正しくありません (expected:%d, actual:%d)", 1, result.Chair.Value.Stats.TotalRidesCount)
			}
			break
		}
	}

	return nil
}

func validateAppNotification(req *api.AppRide, requestID string, status api.RideStatus) error {
	if req.ID != requestID {
		return fmt.Errorf("GET /api/app/notification の返却するIDが、リクエストIDと一致しません (expected:%s, actual:%s)", requestID, req.ID)
	}
	if req.PickupCoordinate.Latitude != 0 {
		return fmt.Errorf("GET /api/app/notification の返却するpickup_coordinateのlatitudeが正しくありません (expected:%d, actual:%d)", 0, req.PickupCoordinate.Latitude)
	}
	if req.PickupCoordinate.Longitude != 0 {
		return fmt.Errorf("GET /api/app/notification の返却するpickup_coordinateのlongitudeが正しくありません (expected:%d, actual:%d)", 0, req.PickupCoordinate.Longitude)
	}
	if req.DestinationCoordinate.Latitude != 10 {
		return fmt.Errorf("GET /api/app/notification の返却するdestination_coordinateのlatitudeが正しくありません (expected:%d, actual:%d)", 10, req.DestinationCoordinate.Latitude)
	}
	if req.DestinationCoordinate.Longitude != 10 {
		return fmt.Errorf("GET /api/app/notification の返却するdestination_coordinateのlongitudeが正しくありません (expected:%d, actual:%d)", 10, req.DestinationCoordinate.Longitude)
	}

	if req.Status != status {
		return fmt.Errorf("GET /api/app/notification の返却するstatusが正しくありません (expected:%s, actual:%s)", status, req.Status)
	}

	return nil
}

func validateAppNotificationWithChair(req *api.AppRide, requestID string, status api.RideStatus, chairID string) error {
	if err := validateAppNotification(req, requestID, status); err != nil {
		return err
	}
	if !req.Chair.Set {
		return errors.New("GET /api/app/notification の返却するchairが、返却されるべきです")
	}
	if req.Chair.Value.ID != chairID {
		return fmt.Errorf("GET /api/app/notification の返却するchair.idが正しくありません (expected:%s, actual:%s)", chairID, req.Chair.Value.ID)
	}
	if req.Chair.Value.Name != "hoge" {
		return fmt.Errorf("GET /api/app/notification の返却するchair.nameが正しくありません (expected:%s, actual:%s)", "hoge", req.Chair.Value.Name)
	}
	if req.Chair.Value.Model != "A" {
		return fmt.Errorf("GET /api/app/notification の返却するchair.modelが正しくありません (expected:%s, actual:%s)", "A", req.Chair.Value.Model)
	}
	return nil
}

func validateChairNotification(req *api.ChairGetNotificationOK, requestID string, userID string, status api.RideStatus) error {
	if req.RideID != requestID {
		return fmt.Errorf("GET /api/chair/notification の返却するIDが、リクエストIDと一致しません (expected:%s, actual:%s)", requestID, req.RideID)
	}
	if req.User.ID != userID {
		return fmt.Errorf("GET /api/chair/notification の返却するuser.idが、ユーザーIDと一致しません (expected:%s, actual:%s)", userID, req.User.ID)
	}
	if req.User.Name != "hoge hoge" {
		return fmt.Errorf("GET /api/chair/notification の返却するuser.nameが正しくありません (expected:%s, actual:%s)", "hoge hoge", req.User.Name)
	}
	if req.PickupCoordinate.Latitude != 0 {
		return fmt.Errorf("GET /api/chair/notification の返却するpickup_coordinateのlatitudeが正しくありません (expected:%d, actual:%d)", 0, req.PickupCoordinate.Latitude)
	}
	if req.PickupCoordinate.Longitude != 0 {
		return fmt.Errorf("GET /api/chair/notification の返却するpickup_coordinateのlongitudeが正しくありません (expected:%d, actual:%d)", 0, req.PickupCoordinate.Longitude)
	}
	if req.DestinationCoordinate.Latitude != 10 {
		return fmt.Errorf("GET /api/chair/notification の返却するdestination_coordinateのlatitudeが正しくありません (expected:%d, actual:%d)", 10, req.DestinationCoordinate.Latitude)
	}
	if req.DestinationCoordinate.Longitude != 10 {
		return fmt.Errorf("GET /api/chair/notification の返却するdestination_coordinateのlongitudeが正しくありません (expected:%d, actual:%d)", 10, req.DestinationCoordinate.Longitude)
	}
	if req.Status != status {
		return fmt.Errorf("GET /api/chair/notification の返却するstatusが正しくありません (expected:%s, actual:%s)", status, req.Status)
	}
	return nil
}
