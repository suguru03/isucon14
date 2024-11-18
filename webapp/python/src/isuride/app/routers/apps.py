"""
以下の移植
https://github.com/isucon/isucon14/blob/main/webapp/go/app_handlers.go

TODO: このdocstringを消す
"""

import random
import string
from http.client import HTTPException
from pydantic import BaseModel
from fastapi import APIRouter, Response
from ulid import ULID
from ..sql import engine
from sqlalchemy import text


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
def app_post_users(r: AppPostUsersRequest, response: Response) -> AppPostUsersRequest:
    # TODO: should mimic secureRandomStr
    user_id = str(ULID())
    access_token = "".join(random.sample(string.ascii_letters + string.digits, 32))
    invitation_code = "".join(random.sample(string.ascii_letters + string.digits, 15))

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

        # insert a coupon for the first registration campaign
        conn.execute(
            text(
                "INSERT INTO coupons (user_id, code, discount) VALUES (:user_id, :code, :discount)"
            ),
            {"user_id": user_id, "code": "CP_NEW2024", "discount": 3000},
        )

        # Verify if invitation code is valid
        if r.invitation_code:
            # Check the number of times the coupons has been used
            coupons = conn.execute(
                "SELECT * FROM coupons WHERE code = :code FOR UPDATE",
                {"code": "INV_" + r.invitation_code},
            ).fetchall()

            if len(coupons) >= 3:
                raise HTTPException(
                    status_code=400, detail="この招待コードは使用できません"
                )

            # Validate inviter existance
            inviter = conn.execute(
                "SELECT * FROM users WHERE invitation_code = :invitation_code",
                {"invitation_code": r.invitation_code},
            ).fetchone()

            if not inviter:
                raise HTTPException(
                    status_code=400, detail="この招待コードは使用できません。"
                )

            # insert an invitation coupon to newcomer
            conn.execute(
                "INSERT INTO coupons (user_id, code, discount) VALUES (:user_id, :code, :discount)",
                {
                    "user_id": user_id,
                    "code": "INV_" + r.invitation_code,
                    "discount": 1500,
                },
            )

            # insert a reward coupon to inviter
            conn.execute(
                "INSERT INTO coupons (user_id, code, discount) VALUES (:user_id, :code, :discount)",
                {
                    "user_id": inviter.id,
                    "code": "RWD_" + r.invitation_code,
                    "discount": 1000,
                },
            )

    response.set_cookie(key="app_session", value=access_token, path="/")
    return AppPostUsersResponse(id=user_id, invitation_code=invitation_code)
