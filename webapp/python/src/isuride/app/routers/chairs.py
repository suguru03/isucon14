"""
以下の移植
https://github.com/isucon/isucon14/blob/main/webapp/go/chair_handlers.go

TODO: このdocstringを消す
"""

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from ulid import ULID

from ..models import Owner
from ..sql import engine
from ..utils import secure_random_str

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


@router.post("/activity")
def chair_post_activity():
    pass


@router.post("/coordinate")
def chair_post_coordinate():
    return {"datetime": "2024-11-01T00:00:00Z"}  # RFC3339


@router.get("/notification", status_code=204)
def char_get_notification():
    # TODO: implement
    # https://github.com/isucon/isucon14/blob/9571164b2b053f453dc0d24e0202d95c2fef253b/webapp/go/chair_handlers.go#L141
    pass


@router.post("/rides/{ride_id}/status")
def chair_post_ride_status():
    pass
