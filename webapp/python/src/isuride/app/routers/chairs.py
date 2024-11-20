"""
以下の移植
https://github.com/isucon/isucon14/blob/main/webapp/go/chair_handlers.go

TODO: このdocstringを消す
"""

import random
import string

from fastapi import APIRouter
from ulid import ULID
from ..utils import secure_random_str

router = APIRouter(prefix="/api/chair")


@router.post("/chairs", status_code=201)
def chair_post_chairs():
    chair_id = str(ULID())
    # TODO: should mimic secureRandomStr
    access_token = secure_random_str(32)
    return {"access_token": access_token, "id": chair_id}


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
