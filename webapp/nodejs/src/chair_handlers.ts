import type { Context } from "hono";
import type { Environment } from "./types/hono.js";
import type { RowDataPacket } from "mysql2";
import type { ChairLocation, Owner, Ride, RideStatus } from "./types/models.js";
import { randomUUID } from "node:crypto";
import { secureRandomStr } from "./utils/random.js";
import path from "node:path";
import { setCookie } from "hono/cookie";
import type { Connection } from "mysql2/promise";
import { getLatestRideStatus } from "./common.js";

export const chairPostChairs = async (ctx: Context<Environment>) => {
  const reqJson = await ctx.req.json();
  const { name, model, chair_register_token } = reqJson;
  if (!name || !model || !chair_register_token) {
    return ctx.text(
      "some of required fields(name, model, chair_register_token) are empty",
      400,
    );
  }
  const [[owner]] = await ctx.var.dbConn.query<Array<Owner & RowDataPacket>>(
    "SELECT * FROM owners WHERE chair_register_token = ?",
    [chair_register_token],
  );
  if (!owner) {
    return ctx.text("invalid chair_register_token", 401);
  }
  const chairID = randomUUID();
  const accessToken = secureRandomStr(32);
  await ctx.var.dbConn.query(
    "INSERT INTO chairs (id, owner_id, name, model, is_active, access_token) VALUES (?, ?, ?, ?, ?, ?)",
    [chairID, owner.id, name, model, false, accessToken],
  );

  setCookie(ctx, "chair_session", accessToken, { path: "/" });

  return ctx.json({ id: chairID, owner_id: owner.id }, 201);
};

export const chairPostActivity = async (ctx: Context<Environment>) => {
  const chair = ctx.var.chair;
  const reqJson = await ctx.req.json();
  await ctx.var.dbConn.query("UPDATE chairs SET is_active = ? WHERE id = ?", [
    reqJson.is_active,
    chair.id,
  ]);
  return ctx.status(204);
};

export const chairPostCoordinate = async (ctx: Context<Environment>) => {
  const reqJson = await ctx.req.json();
  const chair = ctx.var.chair;
  const chairLocationID = randomUUID();
  await ctx.var.dbConn.beginTransaction();
  try {
    await ctx.var.dbConn.query(
      "INSERT INTO chair_locations (id, chair_id, latitude, longitude) VALUES (?, ?, ?, ?)",
      [chairLocationID, chair.id, reqJson.latitude, reqJson.longitude],
    );
    const [[location]] = await ctx.var.dbConn.query<
      Array<ChairLocation & RowDataPacket>
    >("SELECT * FROM chair_locations WHERE id = ?", [chairLocationID]);
    const [[ride]] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
      "SELECT * FROM rides WHERE chair_id = ? ORDER BY updated_at DESC LIMIT 1",
      [chair.id],
    );
    if (ride) {
      const status = await getLatestRideStatus(ctx.var.dbConn, ride.id);
      if (status !== "COMPLETED" && status !== "CANCELED") {
        if (
          reqJson.latitude === ride.pickup_latitude &&
          reqJson.longitude === ride.pickup_longitude &&
          status === "ENROUTE"
        ) {
          await ctx.var.dbConn.query(
            "INSERT INTO ride_statuses (id, ride_id, status) VALUES (?, ?, ?)",
            [randomUUID(), ride.id, "PICKUP"],
          );
        }
        if (
          reqJson.latitude === ride.destination_latitude &&
          reqJson.longitude === ride.destination_longitude &&
          status === "CARRYING"
        ) {
          await ctx.var.dbConn.query(
            "INSERT INTO ride_statuses (id, ride_id, status) VALUES (?, ?, ?)",
            [randomUUID(), ride.id, "ARRIVED"],
          );
        }
      }
    }
    await ctx.var.dbConn.commit();
    return ctx.json({ recorded_at: location.created_at.getTime() }, 200);
  } catch (e) {
    await ctx.var.dbConn.rollback();
    return ctx.text(`${e}`, 500);
  }
};

export const chairGetNotification = async (ctx: Context<Environment>) => {
  const chair = ctx.var.chair;
  await ctx.var.dbConn.query("SELECT * FROM chairs WHERE id = ? FOR UPDATE", [
    chair.id,
  ]);

  let [[ride]] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
    "SELECT * FROM rides WHERE chair_id = ? ORDER BY updated_at DESC LIMIT 1",
    [chair.id],
  );
  const found = !!ride;

  let status = "";
  let yetSentRideStatus: RideStatus | undefined = undefined;
  if (found) {
    [[yetSentRideStatus]] = await ctx.var.dbConn.query<
      Array<RideStatus & RowDataPacket>
    >(
      "SELECT * FROM ride_statuses WHERE ride_id = ? AND chair_sent_at IS NULL ORDER BY created_at ASC LIMIT 1",
      [ride.id],
    );
    status = yetSentRideStatus
      ? yetSentRideStatus.status
      : await getLatestRideStatus(ctx.var.dbConn, ride.id);
  }

  await ctx.var.dbConn.beginTransaction();
  try {
    if (!yetSentRideStatus?.id && (!found || status === "COMPLETED")) {
      // MEMO: 一旦最も待たせているリクエストにマッチさせる実装とする。おそらくもっといい方法があるはず…
      const [[matched]] = await ctx.var.dbConn.query<
        Array<Ride & RowDataPacket>
      >(
        "SELECT * FROM rides WHERE chair_id IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE",
      );
      if (!matched) {
        return ctx.json({}, 200);
      }
      await ctx.var.dbConn.query("UPDATE rides SET chair_id = ? WHERE id = ?", [
        chair.id,
        matched.id,
      ]);
      if (!found) {
        ride = matched;
        [[yetSentRideStatus]] = await ctx.var.dbConn.query<
          Array<RideStatus & RowDataPacket>
        >(
          "SELECT * FROM ride_statuses WHERE ride_id = ? AND chair_sent_at IS NULL ORDER BY created_at ASC LIMIT 1",
          [ride.id],
        );
        status = yetSentRideStatus.status;
      }
    }

    const [[user]] = await ctx.var.dbConn.query<Array<Owner & RowDataPacket>>(
      "SELECT * FROM users WHERE id = ? FOR SHARE",
      [ride.user_id],
    );

    if (yetSentRideStatus) {
      await ctx.var.dbConn.query(
        "UPDATE ride_statuses SET chair_sent_at = CURRENT_TIMESTAMP(6) WHERE id = ?",
        [yetSentRideStatus.id],
      );
    }

    await ctx.var.dbConn.commit();
    return ctx.json(
      {
        data: {
          ride_id: ride.id,
          user: {
            id: user.id,
            name: `${user.firstname} ${user.lastname}`,
          },
          pickup_coordinate: {
            latitude: ride.pickup_latitude,
            longitude: ride.pickup_longitude,
          },
          destination_coordinate: {
            latitude: ride.destination_latitude,
            longitude: ride.destination_longitude,
          },
          status,
        },
      },
      200,
    );
  } catch (e) {
    await ctx.var.dbConn.rollback();
    return ctx.text(`${e}`, 500);
  }
};

export const chairPostRideStatus = async (ctx: Context<Environment>) => {
  const rideID = ctx.req.param("ride_id");
  const chair = ctx.var.chair;
  const reqJson = await ctx.req.json();
  await ctx.var.dbConn.beginTransaction();
  try {
    const [[ride]] = await ctx.var.dbConn.query<Array<Ride & RowDataPacket>>(
      "SELECT * FROM rides WHERE id = ? FOR UPDATE",
      [rideID],
    );
    if (!ride) {
      return ctx.text("ride not found", 404);
    }
    if (ride.chair_id !== chair.id) {
      return ctx.text("not assigned to this ride", 400);
    }
    switch (reqJson.status) {
      // Acknowledge the ride
      case "ENROUTE":
        await ctx.var.dbConn.query(
          "INSERT INTO ride_statuses (id, ride_id, status) VALUES (?, ?, ?)",
          [randomUUID(), ride.id, "ENROUTE"],
        );
        break;
      // After Picking up user
      case "CARRYING": {
        const status = await getLatestRideStatus(ctx.var.dbConn, ride.id);
        if (status !== "PICKUP") {
          return ctx.text("chair has not arrived yet", 400);
        }
        await ctx.var.dbConn.query(
          "INSERT INTO ride_statuses (id, ride_id, status) VALUES (?, ?, ?)",
          [randomUUID(), ride.id, "CARRYING"],
        );
        break;
      }
      default:
        return ctx.text("invalid status", 400);
    }
    await ctx.var.dbConn.commit();
    return ctx.status(204);
  } catch (e) {
    await ctx.var.dbConn.rollback();
    return ctx.text(`${e}`, 500);
  }
};
