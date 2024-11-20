"""
以下の移植
https://github.com/isucon/isucon14/blob/main/webapp/go/app_handlers.go

TODO: このdocstringを消す
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import text
from ulid import ULID

from ..middlewares import app_auth_middleware
from ..models import Ride, User
from ..sql import engine
from ..utils import secure_random_str
from .owners import fare_per_distance, initial_fare

router = APIRouter(prefix="/api/app")


@router.post("/register", status_code=201)
def app_post_register():
    user_id = str(ULID())
    return {"id": user_id}


@router.post("/payment-methods", status_code=204)
def app_post_payment_methods():
    # TODO: implement
    # https://github.com/isucon/isucon14/blob/9571164b2b053f453dc0d24e0202d95c2fef253b/webapp/go/app_handlers.go#L64
    pass


@router.post("/requests", status_code=202)
def app_post_requests():
    request_id = str(ULID())
    return {"request_id": request_id}


@router.get("/notification", status_code=204)
def app_get_notification():
    pass


@router.get("/users", status_code=200)
def app_get_users():
    pass


class Coordinate(BaseModel):
    latitude: int
    longitude: int


class AppPostRidesRequest(BaseModel):
    pickup_coordinate: Coordinate | None = None
    destination_coordinate: Coordinate | None = None


class AppPostRidesResponse(BaseModel):
    ride_id: str
    fare: int


def get_latest_ride_status(conn, ride_id: str) -> str:
    row = conn.execute(
        text(
            "SELECT status FROM ride_statuses WHERE ride_id = :ride_id ORDER BY created_at DESC LIMIT 1"
        ),
        {"ride_id": ride_id},
    ).fetchone()

    if not row:
        return ""

    return row.status


@router.post("/rides", status_code=202)
def app_post_rides(
    r: AppPostRidesRequest, user: User = Depends(app_auth_middleware)
) -> AppPostRidesResponse:
    if r.pickup_coordinate is None or r.destination_coordinate is None:
        raise HTTPException(
            status_code=400,
            detail="required fields(pickup_coordinate, destination_coordinate) are empty",
        )

    ride_id = str(ULID())
    with engine.begin() as conn:
        rides = conn.execute(
            text("SELECT * FROM rides WHERE user_id = :user_id"), {"user_id": user.id}
        ).fetchall()

        continuing_ride_count: int = 0
        for ride in rides:
            status = get_latest_ride_status(conn, ride.id)
            if status != "COMPLETED" and status != "CANCELED":
                continuing_ride_count += 1

        if continuing_ride_count > 0:
            raise HTTPException(status_code=409, detail="ride already exists")

        conn.execute(
            text(
                "INSERT INTO rides (id, user_id, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude) VALUES (:id, :user_id, :pickup_latitude, :pickup_longitude, :destination_latitude, :destination_longitude)"
            ),
            {
                "id": ride_id,
                "user_id": user.id,
                "pickup_latitude": r.pickup_coordinate.latitude,
                "pickup_longitude": r.pickup_coordinate.longitude,
                "destination_latitude": r.destination_coordinate.latitude,
                "destination_longitude": r.destination_coordinate.longitude,
            },
        )

        conn.execute(
            text(
                "INSERT INTO ride_statuses (id, ride_id, status) VALUES (:id, :ride_id, :status)"
            ),
            {"id": str(ULID()), "ride_id": ride_id, "status": "MATCHING"},
        )

        ride_count = conn.execute(
            text("SELECT COUNT(*) FROM rides WHERE user_id = :user_id"),
            {"user_id": user.id},
        ).scalar()

        if ride_count == 1:
            # 初回利用で、初回利用クーポンがあれば必ず使う
            coupon = conn.execute(
                text(
                    "SELECT * FROM coupons WHERE user_id = :user_id AND code = 'CP_NEW2024' AND used_by IS NULL FOR UPDATE"
                ),
                {"user_id": user.id},
            ).fetchone()

            if coupon:
                conn.execute(
                    text(
                        "UPDATE coupons SET used_by = :ride_id WHERE user_id = :user_id AND code = 'CP_NEW2024'"
                    ),
                    {"ride_id": ride_id, "user_id": user.id},
                )
            else:
                # 無ければ他のクーポンを付与された順番に使う
                coupon = conn.execute(  # type: ignore
                    text(
                        "SELECT * FROM coupons WHERE user_id = :user_id AND used_by IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE"
                    ),
                    {"user_id": user.id},
                )
                if coupon:
                    conn.execute(
                        text(
                            "UPDATE coupons SET used_by = :ride_id WHERE user_id = :user_id AND code = :code"
                        ),
                        {"ride_id": ride_id, "user_id": user.id, "code": coupon.code},
                    )
        else:
            # 他のクーポンを付与された順番に使う
            coupon = conn.execute(
                text(
                    "SELECT * FROM coupons WHERE user_id = :user_id AND used_by IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE"
                ),
                {"user_id": user.id},
            ).fetchone()
            if coupon:
                conn.execute(
                    text(
                        "UPDATE coupons SET used_by = :ride_id WHERE user_id = :user_id AND code = :code"
                    ),
                    {"ride_id": ride_id, "user_id": user.id, "code": coupon.code},
                )

        row = conn.execute(
            text("SELECT * FROM rides WHERE id = :ride_id"), {"ride_id": ride_id}
        ).fetchone()
        ride: Ride = Ride(**row._mapping)  # type: ignore

        fare = calculate_discounted_fare(
            conn,
            user.id,
            ride,  # type: ignore
            r.pickup_coordinate.latitude,
            r.pickup_coordinate.longitude,
            r.destination_coordinate.latitude,
            r.destination_coordinate.longitude,
        )

    return AppPostRidesResponse(ride_id=ride_id, fare=fare)


def calculate_distance(
    a_latitude: int, a_longitude: int, b_latitude: int, b_longitude: int
) -> int:
    return abs(a_latitude - b_latitude) + abs(a_longitude - b_longitude)


class AppPostUsersRequest(BaseModel):
    username: str
    firstname: str
    lastname: str
    date_of_birth: str
    invitation_code: str | None = None


class AppPostUsersResponse(BaseModel):
    id: str
    invitation_code: str


@router.post("/users", response_model=AppPostUsersResponse, status_code=201)
def app_post_users(r: AppPostUsersRequest, response: Response) -> AppPostUsersResponse:
    user_id = str(ULID())
    access_token = secure_random_str(32)
    invitation_code = secure_random_str(15)

    # start transaction
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO users (id, username, firstname, lastname, date_of_birth, access_token, invitation_code) VALUES (:id, :username, :firstname, :lastname, :date_of_birth, :access_token, :invitation_code)"
            ),
            {
                "id": user_id,
                "username": r.username,
                "firstname": r.firstname,
                "lastname": r.lastname,
                "date_of_birth": r.date_of_birth,
                "access_token": access_token,
                "invitation_code": invitation_code,
            },
        )

        # 初回登録キャンペーンのクーポンを付与
        conn.execute(
            text(
                "INSERT INTO coupons (user_id, code, discount) VALUES (:user_id, :code, :discount)"
            ),
            {"user_id": user_id, "code": "CP_NEW2024", "discount": 3000},
        )

        # 招待コードを使った登録
        if r.invitation_code:
            # 招待する側の招待数をチェック
            coupons = conn.execute(
                text("SELECT * FROM coupons WHERE code = :code FOR UPDATE"),
                {"code": "INV_" + r.invitation_code},
            ).fetchall()

            if len(coupons) >= 3:
                raise HTTPException(
                    status_code=400, detail="この招待コードは使用できません"
                )

            # ユーザーチェック
            inviter = conn.execute(
                text("SELECT * FROM users WHERE invitation_code = :invitation_code"),
                {"invitation_code": r.invitation_code},
            ).fetchone()

            if not inviter:
                raise HTTPException(
                    status_code=400, detail="この招待コードは使用できません。"
                )

            # 招待クーポン付与
            conn.execute(
                text(
                    "INSERT INTO coupons (user_id, code, discount) VALUES (:user_id, :code, :discount)"
                ),
                {
                    "user_id": user_id,
                    "code": "INV_" + r.invitation_code,
                    "discount": 1500,
                },
            )

            # 招待した人にもRewardを付与
            conn.execute(
                text(
                    "INSERT INTO coupons (user_id, code, discount) VALUES (:user_id, CONCAT(:code_prefix, '_', FLOOR(UNIX_TIMESTAMP(NOW(3))*1000)), :discount)"
                ),
                {
                    "user_id": inviter.id,
                    "code": "RWD_" + r.invitation_code,
                    "discount": 1000,
                },
            )

    response.set_cookie(key="app_session", value=access_token, path="/")
    return AppPostUsersResponse(id=user_id, invitation_code=invitation_code)


def calculate_discounted_fare(
    conn,
    user_id: str,
    ride: Ride,
    pickup_latitude: int,
    pickup_longitude: int,
    dest_latitude: int,
    dest_longitude: int,
) -> int:
    discount: int = 0

    if ride:
        dest_latitude = ride.destination_latitude
        dest_longitude = ride.destination_longitude
        pickup_latitude = ride.pickup_latitude
        pickup_longitude = ride.pickup_longitude

        # すでにクーポンが紐づいているならそれの割引額を参照
        coupon = conn.execute(
            text("SELECT * FROM coupons WHERE used_by = :ride_id"), {"ride_id": ride.id}
        ).fetchone()
        if coupon:
            discount = coupon.discount
    else:
        # 初回利用クーポンを最優先で使う
        coupon = conn.execute(
            text(
                "SELECT * FROM coupons WHERE user_id = :user_id AND code = 'CP_NEW2024' AND used_by IS NULL"
            ),
            {"user_id": user_id},
        ).fetchone()

        if not coupon:
            # 無いなら他のクーポンを付与された順番に使う
            coupon = conn.execute(
                text(
                    "SELECT * FROM coupons WHERE user_id = :user_id AND used_by IS NULL ORDER BY created_at LIMIT 1"
                ),
                {"user_id": user_id},
            ).fetchone()

        if coupon:
            discount = coupon.discount

    metered_fare: int = fare_per_distance * calculate_distance(
        dest_latitude, dest_longitude, pickup_latitude, pickup_longitude
    )

    discounted_metered_fare: int = max(metered_fare - discount, 0)
    return initial_fare + discounted_metered_fare


class RecentRide(BaseModel):
    id: str
    pickup_coordinate: Coordinate
    destination_coordinate: Coordinate
    distance: int
    duration: int
    evaluation: int


class AppChairStats(BaseModel):
    # 最近の乗車履歴
    recent_rides: list[RecentRide]

    # 累計の情報
    total_rides_count: int
    total_evaluation_avg: float


class AppChair(BaseModel):
    id: str
    name: str
    model: str
    stats: AppChairStats


class AppGetRideResponse(BaseModel):
    id: str
    pickup_coordinate: Coordinate
    destination_coordinate: Coordinate
    status: str
    chair: AppChair | None = None
    created_at: int
    updated_at: int


@router.get(
    "/rides/{ride_id}",
    response_model=AppGetRideResponse,
    status_code=200,
    response_model_exclude_none=True,
)
def app_get_ride(
    ride_id: str, user: User = Depends(app_auth_middleware)
) -> AppGetRideResponse:
    with engine.begin() as conn:
        ride = conn.execute(
            text("SELECT * FROM rides WHERE id = :ride_id"), {"ride_id": ride_id}
        ).fetchone()
        if not ride:
            raise HTTPException(status_code=404, detail="ride not found")
        status = get_latest_ride_status(conn, ride.id)

        response = AppGetRideResponse(
            id=ride.id,
            pickup_coordinate=Coordinate(
                latitude=ride.pickup_latitude, longitude=ride.pickup_longitude
            ),
            destination_coordinate=Coordinate(
                latitude=ride.destination_latitude, longitude=ride.destination_longitude
            ),
            status=status,
            created_at=int(ride.created_at.timestamp() * 1000),
            updated_at=int(ride.updated_at.timestamp() * 1000),
        )

        if ride.chair_id:
            chair = conn.execute(
                text("SELECT * FROM chairs WHERE id = :chair_id"),
                {"chair_id": ride.chair_id},
            ).fetchone()

            # TODO: stats = get_chair_stats(chair.id)
            stats = AppChairStats(
                recent_rides=[], total_rides_count=1, total_evaluation_avg=0.1
            )
            response.chair = AppChair(
                id=chair.id,  # type: ignore
                name=chair.name,  # type: ignore
                model=chair.model,  # type: ignore
                stats=stats,  # type: ignore
            )

    return response
