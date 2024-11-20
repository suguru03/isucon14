"""
以下の移植
https://github.com/isucon/isucon14/blob/main/webapp/go/owner_handlers.go

TODO: このdocstringを消す
"""

from typing import Annotated

from fastapi import APIRouter, Response
from pydantic import BaseModel, StringConstraints
from sqlalchemy import text
from ulid import ULID

from ..sql import engine
from ..utils import secure_random_str

fare_per_distance: int = 100
initial_fare: int = 500

router = APIRouter(prefix="/api/owner")

INITIAL_FARE = 500
FARE_PER_DISTANCE = 100


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


@router.get("/sales")
def owner_get_sales():
    pass


@router.get("/chairs", status_code=200)
def owner_get_chairs():
    return {"chairs": []}


@router.get("/chairs/{chair_id}")
def owner_get_chair_detail():
    pass
