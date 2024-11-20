"""
以下の移植
https://github.com/isucon/isucon14/blob/main/webapp/go/chair_handlers.go

TODO: このdocstringを消す
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from ulid import ULID

from ..middlewares import chair_auth_middleware
from ..models import Chair, ChairLocation, Owner, Ride
from ..sql import engine
from ..utils import secure_random_str
from .apps import get_latest_ride_status

router = APIRouter(prefix="/api/chair")


class ChairPostChairsRequest(BaseModel):
    name: str
    model: str
    chair_register_token: str


class ChairPostChairsResponse(BaseModel):
    id: str
    owner_id: str


@router.post("/chairs", status_code=status.HTTP_201_CREATED)
def chair_post_chairs(
    req: ChairPostChairsRequest, resp: Response
) -> ChairPostChairsResponse:
    if req.name == "" or req.model == "" or req.chair_register_token == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="some of required fields(name, model, chair_register_token) are empty",
        )

    with engine.begin() as conn:
        row = conn.execute(
            text(
                "SELECT * FROM owners WHERE chair_register_token = :chair_register_token"
            ),
            {"chair_register_token": req.chair_register_token},
        ).fetchone()
        if row is None:
            raise HTTPException(
                status_code=status.UNAUTHORIZED, detail="invalid chair_register_token"
            )
        owner = Owner(**row)

    chair_id = str(ULID())
    access_token = secure_random_str(32)

    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO chairs (id, owner_id, name, model, is_active, access_token) VALUES (:id, :owner_id, :name, :model, :is_active, :access_token)",
            ),
            {
                "id": chair_id,
                "owner_id": owner.id,
                "name": req.name,
                "model": req.model,
                "is_active": False,
                "access_token": access_token,
            },
        )

    resp.set_cookie(path="/", key="chair_session", value=access_token)
    return ChairPostChairsResponse(id=chair_id, owner_id=owner.id)


class PostChairActivityRequest(BaseModel):
    is_active: bool


@router.post("/activity", status_code=status.HTTP_204_NO_CONTENT)
def chair_post_activity(
    req: PostChairActivityRequest, chair: Chair = Depends(chair_auth_middleware)
):
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE chairs SET is_active = :is_active WHERE id = :id"),
            {"is_active": req.is_active, "id": chair.id},
        )


# TODO: Requestの構造体がないの、紛らわしいので要検討
class Coordinate(BaseModel):
    latitude: int
    longitude: int


class ChairPostCoordinateResponse(BaseModel):
    recorded_at: int


@router.post("/coordinate")
def chair_post_coordinate(
    req: Coordinate, chair: Chair = Depends(chair_auth_middleware)
):
    with engine.begin() as conn:
        chair_location_id = str(ULID())
        conn.execute(
            text(
                "INSERT INTO chair_locations (id, chair_id, latitude, longitude) VALUES (:id, :chair_id, :latitude, :longitude)"
            )
        )

        row = conn.execute(
            text("SELECT * FROM chair_locations WHERE id = :id"),
            {"id": chair_location_id},
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
        location = ChairLocation(**row)

        row = conn.execute(
            text(
                "SELECT * FROM rides WHERE chair_id = :chair_id ORDER BY updated_at DESC LIMIT 1"
            ),
            {"chair_id": chair.id},
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        ride = Ride(**row)
        ride_status = get_latest_ride_status(conn, ride_id=ride.id)
        if ride_status != "COMPLETED" and ride_status != "CANCELLED":
            if (
                req.latitude == ride.pickup_latitude
                and req.longitude == ride.pickup_longitude
                and ride_status == "ENROUTE"
            ):
                conn.execute(
                    text(
                        "INSERT INTO ride_statuses (id, ride_id, status) VALUES (:id, :ride_id, :status)"
                    ),
                    {"id": str(ULID()), "ride_id": ride.id, "status": "PICKUP"},
                )

            if (
                req.latitude == ride.destination_latitude
                and req.longitude == ride.destination_longitude
                and ride_status == "CARRYING"
            ):
                conn.execute(
                    text(
                        "INSERT INTO ride_statuses (id, ride_id, status) VALUES (:id, :ride_id, :status) "
                    ),
                    {"id": str(ULID()), "ride_id": ride.id, "status": "ARRIVED"},
                )

    return ChairPostCoordinateResponse(
        recorded_at=int(location.created_at.timestamp() * 1000)
    )


@router.get("/notification", status_code=204)
def char_get_notification():
    # TODO: implement
    # https://github.com/isucon/isucon14/blob/9571164b2b053f453dc0d24e0202d95c2fef253b/webapp/go/chair_handlers.go#L141
    pass


@router.post("/rides/{ride_id}/status")
def chair_post_ride_status():
    pass
