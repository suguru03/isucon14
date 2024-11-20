from fastapi import Cookie, HTTPException
from sqlalchemy import text

from .models import Owner, User
from .sql import engine


def app_auth_middleware(app_session=Cookie(default=None)) -> User:
    if not app_session:
        raise HTTPException(status_code=401, detail="app_session cookie is required")

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT * FROM users WHERE access_token = :accesss_token"),
            {"accesss_token": app_session},
        ).fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="invalid access token")
        user = User(**row._mapping)

        return user


def owner_auth_middleware(app_session=Cookie(default=None)) -> Owner:
    if not app_session:
        raise HTTPException(status_code=401, detail="owner_session cookie is required")

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT * FROM owners WHERE access_token = :access_token"),
            {"access_token": app_session},
        ).fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="invalid access token")

        # TODO: _mapping より良いアトリビュートは無いか
        return Owner(**row._mapping)
