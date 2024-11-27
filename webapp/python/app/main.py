import subprocess
from http import HTTPStatus

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text

from . import app_handlers, chair_handlers, owner_handlers
from .sql import engine

# TODO: このコメントを消す
# SQLのログを出したいときは以下の設定を使う
# logging.basicConfig(level=logging.INFO)
# logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
app = FastAPI()
app.include_router(app_handlers.router)
app.include_router(chair_handlers.router)
app.include_router(owner_handlers.router)


class PostInitializeRequest(BaseModel):
    payment_server: str


class PostInitializeResponse(BaseModel):
    language: str


@app.exception_handler(HTTPStatus.INTERNAL_SERVER_ERROR)
async def internal_exception_handler(_request: Request, exc: Exception):
    return JSONResponse(
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR, content={"message": str(exc)}
    )


@app.exception_handler(HTTPException)
def custom_http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})


@app.post("/api/initialize")
def post_initialize(req: PostInitializeRequest) -> PostInitializeResponse:
    # TODO: エラーレスポンスに init.sh の出力を返すようにする
    subprocess.run("../sql/init.sh", check=True)

    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE settings SET value = :value WHERE name = 'payment_gateway_url'",
            ),
            {"value": req.payment_server},
        )

    return PostInitializeResponse(language="python")
