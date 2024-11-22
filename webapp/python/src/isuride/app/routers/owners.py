"""
以下の移植
https://github.com/isucon/isucon14/blob/main/webapp/go/owner_handlers.go

TODO: このdocstringを消す
"""

from collections import defaultdict
from collections.abc import MutableMapping
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, StringConstraints
from sqlalchemy import text
from ulid import ULID

from ..middlewares import owner_auth_middleware
from ..models import Chair, Owner, Ride
from ..sql import engine
from ..utils import secure_random_str, sum_sales

router = APIRouter(prefix="/api/owner")


class OwnerPostOwnersRequest(BaseModel):
    name: Annotated[str, StringConstraints(min_length=1)]


class OwnerPostOwnersResponse(BaseModel):
    id: str
    chair_register_token: str


@router.post("/owners", status_code=201)
def owner_post_owners(
    req: OwnerPostOwnersRequest, response: Response
) -> OwnerPostOwnersResponse:
    # TODO: implement
    # https://github.com/isucon/isucon14/blob/9571164b2b053f453dc0d24e0202d95c2fef253b/webapp/go/owner_handlers.go#L20

    owner_id = str(ULID())
    access_token = secure_random_str(32)
    chair_register_token = secure_random_str(32)

    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO owners (id, name, access_token, chair_register_token) VALUES (:id, :name, :access_token, :chair_register_token)"
            ),
            {
                "id": owner_id,
                "name": req.name,
                "access_token": access_token,
                "chair_register_token": chair_register_token,
            },
        )

    response.set_cookie(path="/", key="owner_session", value=access_token)

    return OwnerPostOwnersResponse(
        id=owner_id, chair_register_token=chair_register_token
    )


class ChairSales(BaseModel):
    id: str
    name: str
    sales: int


class ModelSales(BaseModel):
    model: str
    sales: int


class OwnerGetSalesResponse(BaseModel):
    total_sales: int
    chairs: list[ChairSales]
    models: list[ModelSales]


@router.get("/sales")
def owner_get_sales(
    since: int | None = None,
    until: int | None = None,
    owner: Owner = Depends(owner_auth_middleware),
) -> OwnerGetSalesResponse:
    # TODO: タイムゾーンの扱いに自信なし
    if since is None:
        since_dt = datetime.fromtimestamp(0, tz=timezone.utc)
    else:
        since_dt = datetime.fromtimestamp(since / 1000, tz=timezone.utc)

    if until is None:
        until_dt = datetime(9999, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    else:
        until_dt = datetime.fromtimestamp(until / 1000, tz=timezone.utc)

    with engine.begin() as conn:
        rows = conn.execute(
            text("SELECT * FROM chairs WHERE owner_id = :owner_id"),
            {"owner_id": owner.id},
        )
        chairs = [Chair(**r) for r in rows.mappings()]

        res = OwnerGetSalesResponse(total_sales=0, chairs=[], models=[])
        model_sales_by_model: MutableMapping[str, int] = defaultdict(int)
        for chair in chairs:
            rows = conn.execute(
                text(
                    "SELECT rides.* FROM rides JOIN ride_statuses ON rides.id = ride_statuses.ride_id WHERE chair_id = :chair_id AND status = 'COMPLETED' AND updated_at BETWEEN :since AND :until"
                ),
                # TODO: datetime型で大丈夫なんだっけ？
                {"chair_id": chair.id, "since": since_dt, "until": until_dt},
            )
            rides = [Ride(**r) for r in rows.mappings()]

            chair_sales = sum_sales(rides)

            res.total_sales += chair_sales
            res.chairs.append(
                ChairSales(id=chair.id, name=chair.name, sales=chair_sales)
            )
            model_sales_by_model[chair.model] += chair_sales

        model_sales = []
        for model, sales in model_sales_by_model.items():
            model_sales.append(ModelSales(model=model, sales=sales))

        res.models = model_sales

        return res


class ChairWithDetail(BaseModel):
    id: str
    owner_id: str
    name: str
    access_token: str
    model: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    total_distance: int
    total_distance_updated_at: datetime  # TODO: sql.NullTimeに対応する型は？


class OwnerChair(BaseModel):
    id: str
    name: str
    model: str
    active: bool
    registered_at: int
    total_distance: int
    total_distance_updated_at: int | None  # TODO: omitemptyの対応がいるかも


class OwnerGetChairResponse(BaseModel):
    chairs: list[OwnerChair]


@router.get("/chairs", status_code=200)
def owner_get_chairs(owner: Owner = Depends(owner_auth_middleware)):
    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id,
                       owner_id,
                       name,
                       access_token,
                       model,
                       is_active,
                       created_at,
                       updated_at,
                       IFNULL(total_distance, 0) AS total_distance,
                       total_distance_updated_at
                FROM chairs
                       LEFT JOIN (SELECT chair_id,
                                          SUM(IFNULL(distance, 0)) AS total_distance,
                                          MAX(created_at)          AS total_distance_updated_at
                                   FROM (SELECT chair_id,
                                                created_at,
                                                ABS(latitude - LAG(latitude) OVER (PARTITION BY chair_id ORDER BY created_at)) +
                                                ABS(longitude - LAG(longitude) OVER (PARTITION BY chair_id ORDER BY created_at)) AS distance
                                         FROM chair_locations) tmp
                                   GROUP BY chair_id) distance_table ON distance_table.chair_id = chairs.id
                WHERE owner_id = :owner_id
        """
            ),
            {"owner_id": owner.id},
        )
        chairs = [ChairWithDetail(**r) for r in rows.mappings()]

    res = OwnerGetChairResponse(chairs=[])
    for chair in chairs:
        c = OwnerChair(
            id=chair.id,
            name=chair.name,
            model=chair.model,
            active=chair.is_active,
            # TODO: ミリ秒への変換はこれで良いのだろうか
            registered_at=int(chair.created_at.timestamp() * 1000),
            total_distance=chair.total_distance,
            total_distance_updated_at=None,
        )
        if chair.total_distance_updated_at is not None:
            # TODO: ミリ秒への変換はこれで良いのだろうか
            t = int(chair.total_distance_updated_at.timestamp() * 1000)
            c.total_distance_updated_at = t
        res.chairs.append(c)

    return res


class OwnerGetChairDetailResponse(BaseModel):
    id: str
    name: str
    model: str
    active: bool
    registered_at: int
    total_distance: int
    total_distance_updated_at: int | None  # TODO: omitemptyの対応がいるかも
