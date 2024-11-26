import type mysql from "mysql2/promise";
import type { Context } from "hono";
import { randomUUID } from "node:crypto";
import type { Environment } from "./types/hono.js";
import { secureRandomStr } from "./utils/random.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type {
  PaymentToken,
  Chair,
  Coordinate,
  Coupon,
  Owner,
  Ride,
  RideStatus,
  User,
  ChairLocation,
} from "./types/models.js";
import { setCookie } from "hono/cookie";
import {
  calculateDistance,
  calculateFare,
  calculateSale,
  FARE_PER_DISTANCE,
  INITIAL_FARE,
} from "./common.js";
import type { CountResult } from "./types/util.js";
import { requestPaymentGatewayPostPayment } from "./payment_gateway.js";
import { atoi } from "./utils/intger.js";

type AppPostUserRequest = Readonly<{
  username: string;
  firstname: string;
  lastname: string;
  date_of_birth: string;
  invitation_code: string;
}>;

export const appPostUsers = async (ctx: Context<Environment>) => {
  const reqJson = await ctx.req.json<AppPostUserRequest>();
  if (
    reqJson.username === "" ||
    reqJson.firstname === "" ||
    reqJson.lastname === "" ||
    reqJson.date_of_birth === ""
  ) {
    return ctx.text(
      "required fields(username, firstname, lastname, date_of_birth) are empty",
      400,
    );
  }
  const userId = randomUUID();
  const accessToken = secureRandomStr(32);
  const invitationCode = secureRandomStr(15);
  await ctx.var.dbConn.beginTransaction();
  try {
    await ctx.var.dbConn.query(
      "INSERT INTO users (id, username, firstname, lastname, date_of_birth, access_token, invitation_code) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        reqJson.username,
        reqJson.firstname,
        reqJson.lastname,
        reqJson.date_of_birth,
        accessToken,
        invitationCode,
      ],
    );

    // 初回登録キャンペーンのクーポンを付与
    await ctx.var.dbConn.query(
      "INSERT INTO coupons (user_id, code, discount) VALUES (?, ?, ?)",
      [userId, "CP_NEW2024", 3000],
    );

    // 招待コードを使った登録
    if (reqJson.invitation_code) {
      // 招待する側の招待数をチェック
      const [coupons] = await ctx.var.dbConn.query<
        Array<Coupon & RowDataPacket>
      >(
        "SELECT * FROM coupons WHERE code = ? FOR UPDATE",
        `INV_${reqJson.invitation_code}`,
      );
      if (coupons.length >= 3) {
        return ctx.text("この招待コードは使用できません。", 400);
      }
    }

    // ユーザーチェック
    const [inviter] = await ctx.var.dbConn.query<Array<User & RowDataPacket>>(
      "SELECT * FROM users WHERE invitation_code = ?",
      [reqJson.invitation_code],
    );
    if (inviter.length === 0) {
      return ctx.text("この招待コードは使用できません。", 400);
    }

    // 招待クーポン付与
    await ctx.var.dbConn.query(
      "INSERT INTO coupons (user_id, code, discount) VALUES (?, ?, ?)",
      [userId, `INV_${reqJson.invitation_code}`, 1500],
    );
    // 招待した人にもRewardを付与
    await ctx.var.dbConn.query(
      "INSERT INTO coupons (user_id, code, discount) VALUES (?, CONCAT(?, '_', FLOOR(UNIX_TIMESTAMP(NOW(3))*1000)), ?)",
      [inviter[0].id, `RWD_${reqJson.invitation_code}`, 1000],
    );

    await ctx.var.dbConn.commit();
  } catch (e) {
    await ctx.var.dbConn.rollback();
    return ctx.text(`${e}`, 500);
  }

  setCookie(ctx, "app_sesion", accessToken, {
    path: "/",
  });

  return ctx.json(
    {
      id: userId,
      invitation_code: invitationCode,
    },
    201,
  );
};

export const appPostPaymentMethods = async (ctx: Context<Environment>) => {
  const reqJson = await ctx.req.json<{ token: string }>();
  if (reqJson.token === "") {
    return ctx.text("token is required but was empty", 400);
  }
  const user = ctx.var.user;
  await ctx.var.dbConn.query(
    "INSERT INTO payment_tokens (user_id, token) VALUES (?, ?)",
    [user.id, reqJson.token],
  );
  return ctx.status(204);
};

type GetAppRidesResponseItem = {
  id: string;
  pickup_coordinate: Coordinate;
  destination_coordinate: Coordinate;
  chair: {
    id: string;
    owner: string;
    name: string;
    model: string;
  };
  fare: number;
  evaluation: number | null;
  requested_at: number;
  completed_at: number;
};

export const appGetRides = async (ctx: Context<Environment>) => {
  const user = ctx.var.user;
  const [rides] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
    "SELECT * FROM rides WHERE user_id = ? ORDER BY created_at DESC",
    [user.id],
  );
  const items: GetAppRidesResponseItem[] = [];
  for (const ride of rides) {
    const [status, err] = await getLatestRideStatus(ctx.var.dbConn, ride.id);
    if (err) return ctx.text(`${err}`, 500);
    if (status !== "COMPLETED") {
      continue;
    }

    let item: GetAppRidesResponseItem;
    try {
      const [[chair]] = await ctx.var.dbConn.query<
        Array<Chair & RowDataPacket>
      >("SELECT * FROM chairs WHERE id = ?", [ride.chair_id]);
      const [[owner]] = await ctx.var.dbConn.query<
        Array<Owner & RowDataPacket>
      >("SELECT * FROM users WHERE id = ?", [chair.owner_id]);
      item = {
        id: ride.id,
        pickup_coordinate: {
          latitude: ride.pickup_latitude,
          longitude: ride.pickup_longitude,
        },
        destination_coordinate: {
          latitude: ride.destination_latitude,
          longitude: ride.destination_longitude,
        },
        fare: calculateSale(ride),
        evaluation: ride.evaluation,
        requested_at: ride.created_at.getTime(),
        completed_at: ride.updated_at.getTime(),
        chair: {
          id: chair.id,
          name: chair.name,
          model: chair.model,
          owner: owner.name,
        },
      };
    } catch (e) {
      return ctx.text(`${e}`, 500);
    }
    items.push(item);
  }
  return ctx.json(
    {
      rides: items,
    },
    200,
  );
};

async function getLatestRideStatus(
  dbConn: mysql.Connection,
  rideId: string,
): Promise<string> {
  const [[{ status }]] = await dbConn.query<
    Array<Pick<RideStatus, "status"> & RowDataPacket>
  >(
    "SELECT status FROM ride_statuses WHERE ride_id = ? ORDER BY created_at DESC LIMIT 1",
    [rideId],
  );
  return status;
}

export const appPostRides = async (ctx: Context<Environment>) => {
  const reqJson = await ctx.req.json<{
    pickup_coordinate: Coordinate;
    destination_coordinate: Coordinate;
  }>();
  if (!reqJson.pickup_coordinate || !reqJson.destination_coordinate) {
    return ctx.text(
      "required fields(pickup_coordinate, destination_coordinate) are empty",
      400,
    );
  }
  const user = ctx.var.user;
  const rideId = randomUUID();
  await ctx.var.dbConn.beginTransaction();
  let fare: number;
  try {
    const [rides] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
      "SELECT * FROM rides WHERE user_id = ?",
      [user.id],
    );
    let continuingRideCount = 0;
    for (const ride of rides) {
      const status = await getLatestRideStatus(ctx.var.dbConn, ride.id);
      if (status !== "COMPLETED") {
        continuingRideCount++;
      }
    }
    if (continuingRideCount > 0) {
      return ctx.text("ride already exists", 409);
    }
    await ctx.var.dbConn.query(
      "INSERT INTO rides (id, user_id, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude) VALUES (?, ?, ?, ?, ?, ?)",
      [
        rideId,
        user.id,
        reqJson.pickup_coordinate.latitude,
        reqJson.pickup_coordinate.longitude,
        reqJson.destination_coordinate.latitude,
        reqJson.destination_coordinate.longitude,
      ],
    );
    await ctx.var.dbConn.query(
      "INSERT INTO ride_statuses (id, ride_id, status) VALUES (?, ?, ?)",
      [randomUUID(), rideId, "MATCHING"],
    );
    const [[{ "COUNT(*)": rideCount }]] = await ctx.var.dbConn.query<
      Array<CountResult & RowDataPacket>
    >("SELECT COUNT(*) FROM rides WHERE user_id = ?", [user.id]);
    let coupon: Coupon & RowDataPacket;
    if (rideCount === 1) {
      // 初回利用で、初回利用クーポンがあれば必ず使う
      const [[coupon]] = await ctx.var.dbConn.query<
        Array<Coupon & RowDataPacket>
      >(
        "SELECT * FROM coupons WHERE user_id = ? AND code = 'CP_NEW2024' AND used_by IS NULL FOR UPDATE",
        [user.id],
      );

      // 無ければ他のクーポンを付与された順番に使う
      if (!coupon) {
        const [[coupon]] = await ctx.var.dbConn.query<
          Array<Coupon & RowDataPacket>
        >(
          "SELECT * FROM coupons WHERE user_id = ? AND used_by IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE",
          [user.id],
        );
        await ctx.var.dbConn.query(
          "UPDATE coupons SET used_by = ? WHERE user_id = ? AND code = ?",
          [rideId, user.id, coupon.code],
        );
      } else {
        await ctx.var.dbConn.query(
          "UPDATE coupons SET used_by = ? WHERE user_id = ? AND code = 'CP_NEW2024'",
          [rideId, user.id],
        );
      }
    } else {
      // 他のクーポンを付与された順番に使う
      const [[coupon]] = await ctx.var.dbConn.query<
        Array<Coupon & RowDataPacket>
      >(
        "SELECT * FROM coupons WHERE user_id = ? AND used_by IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE",
        [user.id],
      );
      await ctx.var.dbConn.query(
        "UPDATE coupons SET used_by = ? WHERE user_id = ? AND code = ?",
        [rideId, user.id, coupon.code],
      );
    }
    const [[ride]] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
      "SELECT * FROM rides WHERE id = ?",
      [rideId],
    );
    fare = await calculateDiscountedFare(
      ctx.var.dbConn,
      user.id,
      ride,
      reqJson.pickup_coordinate.latitude,
      reqJson.pickup_coordinate.longitude,
      reqJson.destination_coordinate.latitude,
      reqJson.destination_coordinate.longitude,
    );
    await ctx.var.dbConn.commit();
  } catch (e) {
    await ctx.var.dbConn.rollback();
    return ctx.text(`${e}`, 500);
  }
  return ctx.json(
    {
      ride_id: rideId,
      fare,
    },
    202,
  );
};

export const appPostRidesEstimatedFare = async (ctx: Context<Environment>) => {
  const reqJson = await ctx.req.json<{
    pickup_coordinate: Coordinate;
    destination_coordinate: Coordinate;
  }>();
  if (!reqJson.pickup_coordinate || !reqJson.destination_coordinate) {
    return ctx.text(
      "required fields(pickup_coordinate, destination_coordinate) are empty",
      400,
    );
  }
  const user = ctx.var.user;
  await ctx.var.dbConn.beginTransaction();
  let discounted: number;
  try {
    discounted = await calculateDiscountedFare(
      ctx.var.dbConn,
      user.id,
      null,
      reqJson.pickup_coordinate.latitude,
      reqJson.pickup_coordinate.longitude,
      reqJson.destination_coordinate.latitude,
      reqJson.destination_coordinate.longitude,
    );
    await ctx.var.dbConn.commit();
  } catch (e) {
    await ctx.var.dbConn.rollback();
    return ctx.text(`${e}`, 500);
  }
  return ctx.json(
    {
      fare: discounted,
      discount:
        calculateFare(
          reqJson.pickup_coordinate.latitude,
          reqJson.pickup_coordinate.longitude,
          reqJson.destination_coordinate.latitude,
          reqJson.destination_coordinate.longitude,
        ) - discounted,
    },
    200,
  );
};

export const appPostRideEvaluatation = async (ctx: Context<Environment>) => {
  const rideId = ctx.req.param("ride_id");
  const reqJson = await ctx.req.json<{ evaluation: number }>();
  if (reqJson.evaluation < 1 || reqJson.evaluation > 5) {
    return ctx.text("evaluation must be between 1 and 5", 400);
  }
  await ctx.var.dbConn.beginTransaction();
  try {
    let [[ride]] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
      "SELECT * FROM rides WHERE id = ?",
      rideId,
    );
    if (!ride) {
      return ctx.text("ride not found", 404);
    }
    const status = await getLatestRideStatus(ctx.var.dbConn, ride.id);
    if (status !== "ARRIVED") {
      return ctx.text("not arrived yet", 400);
    }

    const [result] = await ctx.var.dbConn.query<ResultSetHeader>(
      "UPDATE rides SET evaluation = ? WHERE id = ?",
      [reqJson.evaluation, rideId],
    );
    if (result.affectedRows === 0) {
      return ctx.text("ride not found", 404);
    }

    await ctx.var.dbConn.query(
      "INSERT INTO ride_statuses (id, ride_id, status) VALUES (?, ?, ?)",
      [randomUUID(), rideId, "COMPLETED"],
    );

    [[ride]] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
      "SELECT * FROM rides WHERE id = ?",
      rideId,
    );
    if (!ride) {
      return ctx.text("ride not found", 404);
    }

    const [[paymentToken]] = await ctx.var.dbConn.query<
      Array<PaymentToken & RowDataPacket>
    >("SELECT * FROM payment_tokens WHERE user_id = ?", [ride.user_id]);
    if (!paymentToken) {
      return ctx.text("payment token not registered", 400);
    }
    const fare = await calculateDiscountedFare(
      ctx.var.dbConn,
      ride.user_id,
      ride,
      ride.pickup_latitude,
      ride.pickup_longitude,
      ride.destination_latitude,
      ride.destination_longitude,
    );
    const paymentGatewayRequest = { amount: fare };

    const [[paymentGatewayURL]] = await ctx.var.dbConn.query<
      Array<string & RowDataPacket>
    >("SELECT value FROM settings WHERE name = 'payment_gateway_url'");
    await requestPaymentGatewayPostPayment(
      paymentGatewayURL,
      paymentToken.token,
      paymentGatewayRequest,
      async () => {
        const [rides] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
          "SELECT * FROM rides WHERE user_id = ? ORDER BY created_at ASC",
          [ride.user_id],
        );
        return rides;
      },
    );
    await ctx.var.dbConn.commit();
  } catch (err) {
    await ctx.var.dbConn.rollback();
    return ctx.text(`${err}`, 500);
  }

  return ctx.json(
    {
      completed_at: new Date().getTime(),
    },
    200,
  );
};

type AppGetNotificationResponseData = {
  ride_id: string;
  pickup_coordinate: Coordinate;
  destination_coordinate: Coordinate;
  fare: number;
  status: string;
  chair?: {
    id: string;
    name: string;
    model: string;
    stats: {
      total_rides_count: number;
      total_evaluation_avg: number;
    };
  };
  created_at: number;
  updated_at: number;
};

type AppGetNotificationResponse = {
  data: AppGetNotificationResponseData;
};

export const appGetNotification = async (ctx: Context<Environment>) => {
  let response: AppGetNotificationResponse;
  const user = ctx.var.user;
  ctx.var.dbConn.beginTransaction();
  try {
    const [[ride]] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
      "SELECT * FROM rides WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [user.id],
    );
    if (!ride) {
      return ctx.json({}, 200);
    }
    const [[yetSentRideStatus]] = await ctx.var.dbConn.query<
      Array<RideStatus & RowDataPacket>
    >(
      "SELECT * FROM ride_statuses WHERE ride_id = ? AND app_sent_at IS NULL ORDER BY created_at ASC LIMIT 1",
      [ride.id],
    );
    const status = yetSentRideStatus
      ? yetSentRideStatus.status
      : await getLatestRideStatus(ctx.var.dbConn, ride.id);

    const fare = await calculateDiscountedFare(
      ctx.var.dbConn,
      user.id,
      ride,
      ride.pickup_latitude,
      ride.pickup_longitude,
      ride.destination_latitude,
      ride.destination_longitude,
    );

    response = {
      data: {
        ride_id: ride.id,
        pickup_coordinate: {
          latitude: ride.pickup_latitude,
          longitude: ride.pickup_longitude,
        },
        destination_coordinate: {
          latitude: ride.destination_latitude,
          longitude: ride.destination_longitude,
        },
        fare,
        status,
        created_at: ride.created_at.getTime(),
        updated_at: ride.updated_at.getTime(),
      },
    };
    if (ride.chair_id !== null) {
      const [[chair]] = await ctx.var.dbConn.query<
        Array<Chair & RowDataPacket>
      >("SELECT * FROM chairs WHERE id = ?", [ride.chair_id]);
      const stats = await getChairStats(ctx.var.dbConn, chair.id);
      response.data.chair = {
        id: chair.id,
        name: chair.name,
        model: chair.model,
        stats: {
          total_rides_count: stats.total_rides_count,
          total_evaluation_avg: stats.total_evaluation_avg,
        },
      };
    }

    if (yetSentRideStatus.id) {
      await ctx.var.dbConn.query(
        "UPDATE ride_statuses SET app_sent_at = CURRENT_TIMESTAMP(6) WHERE id = ?",
        [yetSentRideStatus.id],
      );
    }

    await ctx.var.dbConn.commit();
  } catch (e) {
    await ctx.var.dbConn.rollback();
    return ctx.text(`${e}`, 500);
  }
  return ctx.json(response, 200);
};

type AppGetNotificationResponseChairStats = {
  total_rides_count: number;
  total_evaluation_avg: number;
};

async function getChairStats(
  dbConn: mysql.Connection,
  chairId: string,
): Promise<AppGetNotificationResponseChairStats> {
  const [rides] = await dbConn.query<Array<Ride & RowDataPacket>>(
    "SELECT * FROM rides WHERE chair_id = ? ORDER BY updated_at DESC",
    [chairId],
  );

  const totalRidesCount = rides.length;
  let totalEvaluation = 0.0;
  for (const ride of rides) {
    const [rideStatuses] = await dbConn.query<
      Array<RideStatus & RowDataPacket>
    >("SELECT * FROM ride_statuses WHERE ride_id = ? ORDER BY created_at", [
      ride.id,
    ]);
    let arrivedAt: Date | undefined;
    let pickupedAt: Date | undefined;
    let isCompleted = false;
    for (const status of rideStatuses) {
      if (status.status === "ARRIVED") {
        arrivedAt = status.created_at;
      } else if (status.status === "CARRYING") {
        pickupedAt = status.created_at;
      }
      if (status.status === "COMPLETED") {
        isCompleted = true;
      }
      if (!(arrivedAt && pickupedAt)) {
        continue;
      }
      if (!isCompleted) {
        continue;
      }

      totalEvaluation += ride.evaluation ?? 0;
    }
  }
  return {
    total_rides_count: totalRidesCount,
    total_evaluation_avg:
      totalRidesCount > 0 ? totalEvaluation / totalRidesCount : 0,
  };
}

export const appGetNearbyChairs = async (ctx: Context<Environment>) => {
  const latStr = ctx.req.query("latitude");
  const lonStr = ctx.req.query("longitude");
  const distanceStr = ctx.req.query("distance");
  if (!latStr || !lonStr) {
    return ctx.text("latitude and longitude is empty", 400);
  }

  const lat = atoi(latStr);
  if (lat === false) {
    return ctx.text("latitude is invalid", 400);
  }
  const lon = atoi(lonStr);
  if (lon === false) {
    return ctx.text("longitude is invalid", 400);
  }

  let distance: number | false = 50;
  if (distanceStr) {
    distance = atoi(distanceStr);
    if (distance === false) {
      return ctx.text("distance is invalid", 400);
    }
  }

  const coordinate: Coordinate = { latitude: lat, longitude: lon };

  await ctx.var.dbConn.beginTransaction();
  try {
    const [chairs] = await ctx.var.dbConn.query<Array<Chair & RowDataPacket>>(
      "SELECT * FROM chairs",
    );
    const nearbyChairs: Array<{
      id: string;
      name: string;
      model: string;
      current_coordinate: Coordinate;
    }> = [];
    for (const chair of chairs) {
      if (!chair.is_active) continue;
      const [[ride]] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
        "SELECT * FROM rides WHERE chair_id = ? ORDER BY created_at DESC LIMIT 1",
        [chair.id],
      );
      if (ride) {
        // 過去にライドが存在し、かつ、それが完了していない場合はスキップ
        const status = await getLatestRideStatus(ctx.var.dbConn, ride.id);
        if (status !== "COMPLETED") {
          continue;
        }
      }

      // 最新の位置情報を取得
      const [[chairLocation]] = await ctx.var.dbConn.query<
        Array<ChairLocation & RowDataPacket>
      >(
        "SELECT * FROM chair_locations WHERE chair_id = ? ORDER BY created_at DESC LIMIT 1",
        [chair.id],
      );

      if (
        calculateDistance(
          coordinate.latitude,
          coordinate.longitude,
          chairLocation.latitude,
          chairLocation.longitude,
        ) <= distance
      ) {
        nearbyChairs.push({
          id: chair.id,
          name: chair.name,
          model: chair.model,
          current_coordinate: {
            latitude: chairLocation.latitude,
            longitude: chairLocation.longitude,
          },
        });
      }
    }

    const [[{ "CURRENT_TIMESTAMP(6)": retrievedAt }]] =
      await ctx.var.dbConn.query<
        Array<{ "CURRENT_TIMESTAMP(6)": Date } & RowDataPacket>
      >("SELECT CURRENT_TIMESTAMP(6)");
    await ctx.var.dbConn.commit();
    return ctx.json(
      {
        chairs: nearbyChairs,
        retrieved_at: retrievedAt.getTime(),
      },
      200,
    );
  } catch (err) {
    await ctx.var.dbConn.rollback();
    return ctx.text(`${err}`, 500);
  }
};

async function calculateDiscountedFare(
  dbConn: mysql.Connection,
  userId: string,
  ride: Ride | null,
  pickupLatitude: number,
  pickupLongitude: number,
  destinationLatitude: number,
  destinationLongitude: number,
): Promise<number> {
  let discount = 0;
  if (ride) {
    const destinationLatitude = ride.destination_latitude;
    const destinationLongitude = ride.destination_longitude;
    const pickupLatitude = ride.pickup_latitude;
    const pickupLongitude = ride.pickup_longitude;

    // すでにクーポンが紐づいているならそれの割引額を参照
    const [[coupon]] = await dbConn.query<Array<Coupon & RowDataPacket>>(
      "SELECT * FROM coupons WHERE used_by = ?",
      ride.id,
    );
    if (coupon) {
      discount = coupon.discount;
    }
  } else {
    // 初回利用クーポンを最優先で使う
    const [[coupon]] = await dbConn.query<Array<Coupon & RowDataPacket>>(
      "SELECT * FROM coupons WHERE user_id = ? AND code = 'CP_NEW2024' AND used_by IS NULL",
      [userId],
    );
    if (coupon) {
      discount = coupon.discount;
    } else {
      // 無いなら他のクーポンを付与された順番に使う
      const [[coupon]] = await dbConn.query<Array<Coupon & RowDataPacket>>(
        "SELECT * FROM coupons WHERE user_id = ? AND used_by IS NULL ORDER BY created_at LIMIT 1",
        [userId],
      );
      discount = coupon.discount;
    }
  }
  const meteredFare =
    FARE_PER_DISTANCE *
    calculateDistance(
      pickupLatitude,
      pickupLongitude,
      destinationLatitude,
      destinationLongitude,
    );
  const discountedMeteredFare = Math.max(meteredFare - discount, 0);

  return INITIAL_FARE + discountedMeteredFare;
}

/**
 * package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/oklog/ulid/v2"
)

type appPostUsersRequest struct {
	Username       string  `json:"username"`
	FirstName      string  `json:"firstname"`
	LastName       string  `json:"lastname"`
	DateOfBirth    string  `json:"date_of_birth"`
	InvitationCode *string `json:"invitation_code"`
}

type appPostUsersResponse struct {
	ID             string `json:"id"`
	InvitationCode string `json:"invitation_code"`
}

func appPostUsers(w http.ResponseWriter, r *http.Request) {
	req := &appPostUsersRequest{}
	if err := bindJSON(r, req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if req.Username == "" || req.FirstName == "" || req.LastName == "" || req.DateOfBirth == "" {
		writeError(w, http.StatusBadRequest, errors.New("required fields(username, firstname, lastname, date_of_birth) are empty"))
		return
	}

	userID := ulid.Make().String()
	accessToken := secureRandomStr(32)
	invitationCode := secureRandomStr(15)

	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(
		"INSERT INTO users (id, username, firstname, lastname, date_of_birth, access_token, invitation_code) VALUES (?, ?, ?, ?, ?, ?, ?)",
		userID, req.Username, req.FirstName, req.LastName, req.DateOfBirth, accessToken, invitationCode,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	// 初回登録キャンペーンのクーポンを付与
	_, err = tx.Exec(
		"INSERT INTO coupons (user_id, code, discount) VALUES (?, ?, ?)",
		userID, "CP_NEW2024", 3000,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	// 招待コードを使った登録
	if req.InvitationCode != nil && *req.InvitationCode != "" {
		// 招待する側の招待数をチェック
		var coupons []Coupon
		err = tx.Select(&coupons, "SELECT * FROM coupons WHERE code = ? FOR UPDATE", "INV_"+*req.InvitationCode)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		if len(coupons) >= 3 {
			writeError(w, http.StatusBadRequest, errors.New("この招待コードは使用できません。"))
			return
		}

		// ユーザーチェック
		var inviter User
		err = tx.Get(&inviter, "SELECT * FROM users WHERE invitation_code = ?", *req.InvitationCode)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusBadRequest, errors.New("この招待コードは使用できません。"))
				return
			}
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		// 招待クーポン付与
		_, err = tx.Exec(
			"INSERT INTO coupons (user_id, code, discount) VALUES (?, ?, ?)",
			userID, "INV_"+*req.InvitationCode, 1500,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		// 招待した人にもRewardを付与
		_, err = tx.Exec(
			"INSERT INTO coupons (user_id, code, discount) VALUES (?, CONCAT(?, '_', FLOOR(UNIX_TIMESTAMP(NOW(3))*1000)), ?)",
			inviter.ID, "RWD_"+*req.InvitationCode, 1000,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Path:  "/",
		Name:  "app_session",
		Value: accessToken,
	})

	writeJSON(w, http.StatusCreated, &appPostUsersResponse{
		ID:             userID,
		InvitationCode: invitationCode,
	})
}

type appPostPaymentMethodsRequest struct {
	Token string `json:"token"`
}

func appPostPaymentMethods(w http.ResponseWriter, r *http.Request) {
	req := &appPostPaymentMethodsRequest{}
	if err := bindJSON(r, req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if req.Token == "" {
		writeError(w, http.StatusBadRequest, errors.New("token is required but was empty"))
		return
	}

	user := r.Context().Value("user").(*User)

	_, err := db.Exec(
		`INSERT INTO payment_tokens (user_id, token) VALUES (?, ?)`,
		user.ID,
		req.Token,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type getAppRidesResponse struct {
	Rides []getAppRidesResponseItem `json:"rides"`
}

type getAppRidesResponseItem struct {
	ID                    string                       `json:"id"`
	PickupCoordinate      Coordinate                   `json:"pickup_coordinate"`
	DestinationCoordinate Coordinate                   `json:"destination_coordinate"`
	Chair                 getAppRidesResponseItemChair `json:"chair"`
	Fare                  int                          `json:"fare"`
	Evaluation            int                          `json:"evaluation"`
	RequestedAt           int64                        `json:"requested_at"`
	CompletedAt           int64                        `json:"completed_at"`
}

type getAppRidesResponseItemChair struct {
	ID    string `json:"id"`
	Owner string `json:"owner"`
	Name  string `json:"name"`
	Model string `json:"model"`
}

func appGetRides(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*User)

	rides := []Ride{}
	if err := db.Select(
		&rides,
		`SELECT * FROM rides WHERE user_id = ? ORDER BY created_at DESC`,
		user.ID,
	); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	items := []getAppRidesResponseItem{}
	for _, ride := range rides {
		status, err := getLatestRideStatus(db, ride.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		if status != "COMPLETED" {
			continue
		}

		item := getAppRidesResponseItem{
			ID:                    ride.ID,
			PickupCoordinate:      Coordinate{Latitude: ride.PickupLatitude, Longitude: ride.PickupLongitude},
			DestinationCoordinate: Coordinate{Latitude: ride.DestinationLatitude, Longitude: ride.DestinationLongitude},
			Fare:                  calculateSale(ride),
			Evaluation:            *ride.Evaluation,
			RequestedAt:           ride.CreatedAt.UnixMilli(),
			CompletedAt:           ride.UpdatedAt.UnixMilli(),
		}

		item.Chair = getAppRidesResponseItemChair{}

		chair := &Chair{}
		if err := db.Get(chair, `SELECT * FROM chairs WHERE id = ?`, ride.ChairID); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		item.Chair.ID = chair.ID
		item.Chair.Name = chair.Name
		item.Chair.Model = chair.Model

		owner := &Owner{}
		if err := db.Get(owner, `SELECT * FROM owners WHERE id = ?`, chair.OwnerID); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		item.Chair.Owner = owner.Name

		items = append(items, item)
	}

	writeJSON(w, http.StatusOK, &getAppRidesResponse{
		Rides: items,
	})
}

type appPostRidesRequest struct {
	PickupCoordinate      *Coordinate `json:"pickup_coordinate"`
	DestinationCoordinate *Coordinate `json:"destination_coordinate"`
}

type appPostRidesResponse struct {
	RideID string `json:"ride_id"`
	Fare   int    `json:"fare"`
}

type executableGet interface {
	Get(dest interface{}, query string, args ...interface{}) error
}

func getLatestRideStatus(tx executableGet, rideID string) (string, error) {
	status := ""
	if err := tx.Get(&status, `SELECT status FROM ride_statuses WHERE ride_id = ? ORDER BY created_at DESC LIMIT 1`, rideID); err != nil {
		return "", err
	}
	return status, nil
}

func appPostRides(w http.ResponseWriter, r *http.Request) {
	req := &appPostRidesRequest{}
	if err := bindJSON(r, req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if req.PickupCoordinate == nil || req.DestinationCoordinate == nil {
		writeError(w, http.StatusBadRequest, errors.New("required fields(pickup_coordinate, destination_coordinate) are empty"))
		return
	}

	user := r.Context().Value("user").(*User)
	rideID := ulid.Make().String()

	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	rides := []Ride{}
	if err := tx.Select(&rides, `SELECT * FROM rides WHERE user_id = ?`, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	continuingRideCount := 0
	for _, ride := range rides {
		status, err := getLatestRideStatus(tx, ride.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		if status != "COMPLETED" {
			continuingRideCount++
		}
	}

	if continuingRideCount > 0 {
		writeError(w, http.StatusConflict, errors.New("ride already exists"))
		return
	}

	if _, err := tx.Exec(
		`INSERT INTO rides (id, user_id, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude)
				  VALUES (?, ?, ?, ?, ?, ?)`,
		rideID, user.ID, req.PickupCoordinate.Latitude, req.PickupCoordinate.Longitude, req.DestinationCoordinate.Latitude, req.DestinationCoordinate.Longitude,
	); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if _, err := tx.Exec(
		`INSERT INTO ride_statuses (id, ride_id, status) VALUES (?, ?, ?)`,
		ulid.Make().String(), rideID, "MATCHING",
	); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	var rideCount int
	if err := tx.Get(&rideCount, `SELECT COUNT(*) FROM rides WHERE user_id = ? `, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	var coupon Coupon
	if rideCount == 1 {
		// 初回利用で、初回利用クーポンがあれば必ず使う
		if err := tx.Get(&coupon, "SELECT * FROM coupons WHERE user_id = ? AND code = 'CP_NEW2024' AND used_by IS NULL FOR UPDATE", user.ID); err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusInternalServerError, err)
				return
			}

			// 無ければ他のクーポンを付与された順番に使う
			if err := tx.Get(&coupon, "SELECT * FROM coupons WHERE user_id = ? AND used_by IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE", user.ID); err != nil {
				if !errors.Is(err, sql.ErrNoRows) {
					writeError(w, http.StatusInternalServerError, err)
					return
				}
			} else {
				if _, err := tx.Exec(
					"UPDATE coupons SET used_by = ? WHERE user_id = ? AND code = ?",
					rideID, user.ID, coupon.Code,
				); err != nil {
					writeError(w, http.StatusInternalServerError, err)
					return
				}
			}
		} else {
			if _, err := tx.Exec(
				"UPDATE coupons SET used_by = ? WHERE user_id = ? AND code = 'CP_NEW2024'",
				rideID, user.ID,
			); err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}
		}
	} else {
		// 他のクーポンを付与された順番に使う
		if err := tx.Get(&coupon, "SELECT * FROM coupons WHERE user_id = ? AND used_by IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE", user.ID); err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusInternalServerError, err)
				return
			}
		} else {
			if _, err := tx.Exec(
				"UPDATE coupons SET used_by = ? WHERE user_id = ? AND code = ?",
				rideID, user.ID, coupon.Code,
			); err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}
		}
	}

	ride := Ride{}
	if err := tx.Get(&ride, "SELECT * FROM rides WHERE id = ?", rideID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	fare, err := calculateDiscountedFare(tx, user.ID, &ride, req.PickupCoordinate.Latitude, req.PickupCoordinate.Longitude, req.DestinationCoordinate.Latitude, req.DestinationCoordinate.Longitude)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusAccepted, &appPostRidesResponse{
		RideID: rideID,
		Fare:   fare,
	})
}

type appPostRidesEstimatedFareRequest struct {
	PickupCoordinate      *Coordinate `json:"pickup_coordinate"`
	DestinationCoordinate *Coordinate `json:"destination_coordinate"`
}

type appPostRidesEstimatedFareResponse struct {
	Fare     int `json:"fare"`
	Discount int `json:"discount"`
}

func appPostRidesEstimatedFare(w http.ResponseWriter, r *http.Request) {
	req := &appPostRidesEstimatedFareRequest{}
	if err := bindJSON(r, req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if req.PickupCoordinate == nil || req.DestinationCoordinate == nil {
		writeError(w, http.StatusBadRequest, errors.New("required fields(pickup_coordinate, destination_coordinate) are empty"))
		return
	}

	user := r.Context().Value("user").(*User)

	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	discounted, err := calculateDiscountedFare(tx, user.ID, nil, req.PickupCoordinate.Latitude, req.PickupCoordinate.Longitude, req.DestinationCoordinate.Latitude, req.DestinationCoordinate.Longitude)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, &appPostRidesEstimatedFareResponse{
		Fare:     discounted,
		Discount: calculateFare(req.PickupCoordinate.Latitude, req.PickupCoordinate.Longitude, req.DestinationCoordinate.Latitude, req.DestinationCoordinate.Longitude) - discounted,
	})
}

// マンハッタン距離を求める
func calculateDistance(aLatitude, aLongitude, bLatitude, bLongitude int) int {
	return abs(aLatitude-bLatitude) + abs(aLongitude-bLongitude)
}
func abs(a int) int {
	if a < 0 {
		return -a
	}
	return a
}

type appPostRideEvaluationRequest struct {
	Evaluation int `json:"evaluation"`
}

type appPostRideEvaluationResponse struct {
	CompletedAt int64 `json:"completed_at"`
}

func appPostRideEvaluatation(w http.ResponseWriter, r *http.Request) {
	rideID := r.PathValue("ride_id")

	req := &appPostRideEvaluationRequest{}
	if err := bindJSON(r, req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if req.Evaluation < 1 || req.Evaluation > 5 {
		writeError(w, http.StatusBadRequest, errors.New("evaluation must be between 1 and 5"))
		return
	}

	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	ride := &Ride{}
	if err := tx.Get(ride, `SELECT * FROM rides WHERE id = ?`, rideID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, errors.New("ride not found"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	status, err := getLatestRideStatus(tx, ride.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if status != "ARRIVED" {
		writeError(w, http.StatusBadRequest, errors.New("not arrived yet"))
		return
	}

	result, err := tx.Exec(
		`UPDATE rides SET evaluation = ? WHERE id = ?`,
		req.Evaluation, rideID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if count, err := result.RowsAffected(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	} else if count == 0 {
		writeError(w, http.StatusNotFound, errors.New("ride not found"))
		return
	}

	_, err = tx.Exec(
		`INSERT INTO ride_statuses (id, ride_id, status) VALUES (?, ?, ?)`,
		ulid.Make().String(), rideID, "COMPLETED")
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Get(ride, `SELECT * FROM rides WHERE id = ?`, rideID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, errors.New("ride not found"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	paymentToken := &PaymentToken{}
	if err := tx.Get(paymentToken, `SELECT * FROM payment_tokens WHERE user_id = ?`, ride.UserID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusBadRequest, errors.New("payment token not registered"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	fare, err := calculateDiscountedFare(tx, ride.UserID, ride, ride.PickupLatitude, ride.PickupLongitude, ride.DestinationLatitude, ride.DestinationLongitude)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	paymentGatewayRequest := &paymentGatewayPostPaymentRequest{
		Amount: fare,
	}

	var paymentGatewayURL string
	if err := tx.Get(&paymentGatewayURL, "SELECT value FROM settings WHERE name = 'payment_gateway_url'"); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := requestPaymentGatewayPostPayment(paymentGatewayURL, paymentToken.Token, paymentGatewayRequest, func() ([]Ride, error) {
		rides := []Ride{}
		if err := tx.Select(&rides, `SELECT * FROM rides WHERE user_id = ? ORDER BY created_at ASC`, ride.UserID); err != nil {
			return nil, err
		}
		return rides, nil
	}); err != nil {
		if errors.Is(err, erroredUpstream) {
			writeError(w, http.StatusBadGateway, err)
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, &appPostRideEvaluationResponse{
		CompletedAt: ride.UpdatedAt.UnixMilli(),
	})
}

type appGetNotificationResponse struct {
	Data *appGetNotificationResponseData `json:"data"`
}

type appGetNotificationResponseData struct {
	RideID                string                           `json:"ride_id"`
	PickupCoordinate      Coordinate                       `json:"pickup_coordinate"`
	DestinationCoordinate Coordinate                       `json:"destination_coordinate"`
	Fare                  int                              `json:"fare"`
	Status                string                           `json:"status"`
	Chair                 *appGetNotificationResponseChair `json:"chair,omitempty"`
	CreatedAt             int64                            `json:"created_at"`
	UpdateAt              int64                            `json:"updated_at"`
}

type appGetNotificationResponseChair struct {
	ID    string                               `json:"id"`
	Name  string                               `json:"name"`
	Model string                               `json:"model"`
	Stats appGetNotificationResponseChairStats `json:"stats"`
}

type appGetNotificationResponseChairStats struct {
	TotalRidesCount    int     `json:"total_rides_count"`
	TotalEvaluationAvg float64 `json:"total_evaluation_avg"`
}

func appGetNotification(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*User)

	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	ride := &Ride{}
	if err := tx.Get(ride, `SELECT * FROM rides WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, user.ID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusOK, &appGetNotificationResponse{})
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	yetSentRideStatus := RideStatus{}
	status := ""
	if err := tx.Get(&yetSentRideStatus, `SELECT * FROM ride_statuses WHERE ride_id = ? AND app_sent_at IS NULL ORDER BY created_at ASC LIMIT 1`, ride.ID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			status, err = getLatestRideStatus(tx, ride.ID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}
		} else {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	} else {
		status = yetSentRideStatus.Status
	}

	fare, err := calculateDiscountedFare(tx, user.ID, ride, ride.PickupLatitude, ride.PickupLongitude, ride.DestinationLatitude, ride.DestinationLongitude)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	response := &appGetNotificationResponse{
		Data: &appGetNotificationResponseData{
			RideID: ride.ID,
			PickupCoordinate: Coordinate{
				Latitude:  ride.PickupLatitude,
				Longitude: ride.PickupLongitude,
			},
			DestinationCoordinate: Coordinate{
				Latitude:  ride.DestinationLatitude,
				Longitude: ride.DestinationLongitude,
			},
			Fare:      fare,
			Status:    status,
			CreatedAt: ride.CreatedAt.UnixMilli(),
			UpdateAt:  ride.UpdatedAt.UnixMilli(),
		},
	}

	if ride.ChairID.Valid {
		chair := &Chair{}
		if err := tx.Get(chair, `SELECT * FROM chairs WHERE id = ?`, ride.ChairID); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		stats, err := getChairStats(tx, chair.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		response.Data.Chair = &appGetNotificationResponseChair{
			ID:    chair.ID,
			Name:  chair.Name,
			Model: chair.Model,
			Stats: stats,
		}
	}

	if yetSentRideStatus.ID != "" {
		_, err := tx.Exec(`UPDATE ride_statuses SET app_sent_at = CURRENT_TIMESTAMP(6) WHERE id = ?`, yetSentRideStatus.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, response)
}

func getChairStats(tx *sqlx.Tx, chairID string) (appGetNotificationResponseChairStats, error) {
	stats := appGetNotificationResponseChairStats{}

	rides := []Ride{}
	err := tx.Select(
		&rides,
		`SELECT * FROM rides WHERE chair_id = ? ORDER BY updated_at DESC`,
		chairID,
	)
	if err != nil {
		return stats, err
	}

	totalRideCount := len(rides)
	totalEvaluation := 0.0
	for _, ride := range rides {
		rideStatuses := []RideStatus{}
		err = tx.Select(
			&rideStatuses,
			`SELECT * FROM ride_statuses WHERE ride_id = ? ORDER BY created_at`,
			ride.ID,
		)
		if err != nil {
			return stats, err
		}

		var arrivedAt, pickupedAt *time.Time
		var isCompleted bool
		for _, status := range rideStatuses {
			if status.Status == "ARRIVED" {
				arrivedAt = &status.CreatedAt
			} else if status.Status == "CARRYING" {
				pickupedAt = &status.CreatedAt
			}
			if status.Status == "COMPLETED" {
				isCompleted = true
			}
		}
		if arrivedAt == nil || pickupedAt == nil {
			continue
		}
		if !isCompleted {
			continue
		}

		totalEvaluation += float64(*ride.Evaluation)
	}

	stats.TotalRidesCount = totalRideCount
	if totalRideCount > 0 {
		stats.TotalEvaluationAvg = totalEvaluation / float64(totalRideCount)
	}

	return stats, nil
}

func appGetNotificationSSE(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*User)

	// Server Sent Events
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")

	var lastRide *Ride
	var lastRideStatus string
	f := func() (respond bool, err error) {
		tx, err := db.Beginx()
		if err != nil {
			return false, err
		}
		defer tx.Rollback()

		ride := &Ride{}
		err = tx.Get(ride, `SELECT * FROM rides WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, user.ID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return false, nil
			}
			return false, err

		}
		status, err := getLatestRideStatus(tx, ride.ID)
		if err != nil {
			return false, err

		}
		if lastRide != nil && ride.ID == lastRide.ID && status == lastRideStatus {
			return false, nil
		}

		fare, err := calculateDiscountedFare(tx, user.ID, ride, ride.PickupLatitude, ride.PickupLongitude, ride.DestinationLatitude, ride.DestinationLongitude)
		if err != nil {
			return false, err
		}

		chair := &Chair{}
		stats := appGetNotificationResponseChairStats{}
		if ride.ChairID.Valid {
			if err := tx.Get(chair, `SELECT * FROM chairs WHERE id = ?`, ride.ChairID); err != nil {
				return false, err
			}
			stats, err = getChairStats(tx, chair.ID)
			if err != nil {
				return false, err
			}
		}

		if err := writeSSE(w, &appGetNotificationResponseData{
			RideID: ride.ID,
			PickupCoordinate: Coordinate{
				Latitude:  ride.PickupLatitude,
				Longitude: ride.PickupLongitude,
			},
			DestinationCoordinate: Coordinate{
				Latitude:  ride.DestinationLatitude,
				Longitude: ride.DestinationLongitude,
			},
			Fare:   fare,
			Status: status,
			Chair: &appGetNotificationResponseChair{
				ID:    chair.ID,
				Name:  chair.Name,
				Model: chair.Model,
				Stats: stats,
			},
			CreatedAt: ride.CreatedAt.UnixMilli(),
			UpdateAt:  ride.UpdatedAt.UnixMilli(),
		}); err != nil {
			return false, err
		}
		lastRide = ride
		lastRideStatus = status

		return true, nil
	}

	// 初回送信を必ず行う
	respond, err := f()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if !respond {
		if err := writeSSE(w, nil); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}

	for {
		select {
		case <-r.Context().Done():
			w.WriteHeader(http.StatusOK)
			return

		default:
			respond, err := f()
			if err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}
			if !respond {
				time.Sleep(100 * time.Millisecond)
			}
		}
	}
}

type appGetNearbyChairsResponse struct {
	Chairs      []appGetNearbyChairsResponseChair `json:"chairs"`
	RetrievedAt int64                             `json:"retrieved_at"`
}

type appGetNearbyChairsResponseChair struct {
	ID                string     `json:"id"`
	Name              string     `json:"name"`
	Model             string     `json:"model"`
	CurrentCoordinate Coordinate `json:"current_coordinate"`
}

func appGetNearbyChairs(w http.ResponseWriter, r *http.Request) {
	latStr := r.URL.Query().Get("latitude")
	lonStr := r.URL.Query().Get("longitude")
	distanceStr := r.URL.Query().Get("distance")
	if latStr == "" || lonStr == "" {
		writeError(w, http.StatusBadRequest, errors.New("latitude or longitude is empty"))
		return
	}

	lat, err := strconv.Atoi(latStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, errors.New("latitude is invalid"))
		return
	}

	lon, err := strconv.Atoi(lonStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, errors.New("longitude is invalid"))
		return
	}

	distance := 50
	if distanceStr != "" {
		distance, err = strconv.Atoi(distanceStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, errors.New("distance is invalid"))
			return
		}
	}

	coordinate := Coordinate{Latitude: lat, Longitude: lon}

	tx, err := db.Beginx()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	defer tx.Rollback()

	chairs := []Chair{}
	err = tx.Select(
		&chairs,
		`SELECT * FROM chairs`,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	nearbyChairs := []appGetNearbyChairsResponseChair{}
	for _, chair := range chairs {
		if !chair.IsActive {
			continue
		}

		ride := &Ride{}
		if err := tx.Get(
			ride,
			`SELECT * FROM rides WHERE chair_id = ? ORDER BY created_at DESC LIMIT 1`,
			chair.ID,
		); err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusInternalServerError, err)
				return
			}
		} else {
			// 過去にライドが存在し、かつ、それが完了していない場合はスキップ
			status, err := getLatestRideStatus(tx, ride.ID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}
			if status != "COMPLETED" {
				continue
			}
		}

		// 最新の位置情報を取得
		chairLocation := &ChairLocation{}
		err = tx.Get(
			chairLocation,
			`SELECT * FROM chair_locations WHERE chair_id = ? ORDER BY created_at DESC LIMIT 1`,
			chair.ID,
		)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				continue
			}
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		if calculateDistance(coordinate.Latitude, coordinate.Longitude, chairLocation.Latitude, chairLocation.Longitude) <= distance {
			nearbyChairs = append(nearbyChairs, appGetNearbyChairsResponseChair{
				ID:    chair.ID,
				Name:  chair.Name,
				Model: chair.Model,
				CurrentCoordinate: Coordinate{
					Latitude:  chairLocation.Latitude,
					Longitude: chairLocation.Longitude,
				},
			})
		}
	}

	retrievedAt := &time.Time{}
	err = tx.Get(
		retrievedAt,
		`SELECT CURRENT_TIMESTAMP(6)`,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, &appGetNearbyChairsResponse{
		Chairs:      nearbyChairs,
		RetrievedAt: retrievedAt.UnixMilli(),
	})
}

func calculateFare(pickupLatitude, pickupLongitude, destLatitude, destLongitude int) int {
	meteredFare := farePerDistance * calculateDistance(pickupLatitude, pickupLongitude, destLatitude, destLongitude)
	return initialFare + meteredFare
}

func calculateDiscountedFare(tx *sqlx.Tx, userID string, ride *Ride, pickupLatitude, pickupLongitude, destLatitude, destLongitude int) (int, error) {
	var coupon Coupon
	discount := 0
	if ride != nil {
		destLatitude = ride.DestinationLatitude
		destLongitude = ride.DestinationLongitude
		pickupLatitude = ride.PickupLatitude
		pickupLongitude = ride.PickupLongitude

		// すでにクーポンが紐づいているならそれの割引額を参照
		if err := tx.Get(&coupon, "SELECT * FROM coupons WHERE used_by = ?", ride.ID); err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				return 0, err
			}
		} else {
			discount = coupon.Discount
		}
	} else {
		// 初回利用クーポンを最優先で使う
		if err := tx.Get(&coupon, "SELECT * FROM coupons WHERE user_id = ? AND code = 'CP_NEW2024' AND used_by IS NULL", userID); err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				return 0, err
			}

			// 無いなら他のクーポンを付与された順番に使う
			if err := tx.Get(&coupon, "SELECT * FROM coupons WHERE user_id = ? AND used_by IS NULL ORDER BY created_at LIMIT 1", userID); err != nil {
				if !errors.Is(err, sql.ErrNoRows) {
					return 0, err
				}
			} else {
				discount = coupon.Discount
			}
		} else {
			discount = coupon.Discount
		}
	}

	meteredFare := farePerDistance * calculateDistance(pickupLatitude, pickupLongitude, destLatitude, destLongitude)
	discountedMeteredFare := max(meteredFare-discount, 0)

	return initialFare + discountedMeteredFare, nil
}

 */
