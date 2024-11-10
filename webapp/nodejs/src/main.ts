import { serve } from "@hono/node-server";
import { Hono } from "hono";
import mysql from "mysql2/promise";

const connection = mysql.createConnection({
  host: process.env.ISUCON_DB_HOST || "127.0.0.1",
  port: Number(process.env.ISUCON_DB_PORT || "3306"),
  user: process.env.ISUCON_DB_USER || "isucon",
  password: process.env.ISUCON_DB_PASSWORD || "isucon",
  database: process.env.ISUCON_DB_NAME || "isuride",
});

const app = new Hono();

app.post("/api/initialize", postInitialize);

// app handlers
app.post("/api/app/users", appPostUsers);

app.post("/api/app/payment-methods", appAuthMiddleware, appPostPaymentMethods);
app.get("/api/app/rides", appAuthMiddleware, appGetRides);
app.post("/api/app/rides", appAuthMiddleware, appPostRides);
app.post(
  "/api/app/rides/estimated-fare",
  appAuthMiddleware,
  appPostRidesEstimatedFare,
);
app.get("/api/app/rides/:ride_id", appAuthMiddleware, appGetRide);
app.post(
  "/api/app/rides/:ride_id/evaluation",
  appAuthMiddleware,
  appPostRideEvaluatation,
);
app.get("/api/app/notification", appAuthMiddleware, appGetNotification);
app.get("/api/app/nearby-chairs", appAuthMiddleware, appGetNearbyChairs);

// owner handlers
app.post("/api/owner/owners", ownerPostOwners);

app.get("/api/owner/sales", ownerAuthMiddleware, ownerGetSales);
app.get("/api/owner/chairs", ownerAuthMiddleware, ownerGetChairs);
app.get(
  "/api/owner/chairs/:chair_id",
  ownerAuthMiddleware,
  ownerGetChairDetail,
);

// chair handlers
app.post("/api/chair/chairs", chairPostChairs);

app.post("/api/chair/activity", chairAuthMiddleware, chairPostActivity);
app.post("/api/chair/coordinate", chairAuthMiddleware, chairPostCoordinate);
app.get("/api/chair/notification", chairAuthMiddleware, chairGetNotification);
app.get("/api/chair/rides/:ride_id", chairAuthMiddleware, chairGetRideRequest);
app.post(
  "/api/chair/rides/:ride_id/status",
  chairAuthMiddleware,
  chairPostRideStatus,
);

const port = 8080;
serve(
  {
    fetch: app.fetch,
    port,
  },
  (addr) => {
    console.log(`Server is running on http://localhost:${addr.port}`);
  },
);
