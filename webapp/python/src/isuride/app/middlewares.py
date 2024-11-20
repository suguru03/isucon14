"""
以下の移植
https://github.com/isucon/isucon14/blob/main/webapp/go/middlewares.go

TODO: このdocstringを消す
"""

from fastapi import Cookie, HTTPException, status
from sqlalchemy import text

from .models import Chair, Owner, User
from .sql import engine


def app_auth_middleware(app_session=Cookie(default=None)) -> User:
    if not app_session:
        raise HTTPException(status_code=401, detail="app_session cookie is required")

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT * FROM users WHERE access_token = :access_token"),
            {"access_token": app_session},
        ).fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="invalid access token")
        user = User(**row._mapping)

        return user


def owner_auth_middleware(owner_session=Cookie(default=None)) -> Owner:
    if not owner_session:
        raise HTTPException(status_code=401, detail="owner_session cookie is required")

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT * FROM owners WHERE access_token = :access_token"),
            {"access_token": owner_session},
        ).fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="invalid access token")

        # TODO: _mapping より良いアトリビュートは無いか
        return Owner(**row._mapping)


def chair_auth_middleware(chair_session=Cookie(default=None)) -> Chair:
    if not chair_session:
        raise HTTPException(status_code=401, detail="chair_session cookie is required")

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT * FROM chairs WHERE access_token = :access_token"),
            {"access_token": chair_session},
        ).fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid access token"
            )

        # TODO: _mapping より良いアトリビュートは無いか
        return Chair(**row._mapping)
