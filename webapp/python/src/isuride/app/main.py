import subprocess

from fastapi import FastAPI
from pydantic import BaseModel
from sqlalchemy import text

from .routers import apps, chairs, owners
from .sql import engine

# TODO: このコメントを消す
# SQLのログを出したいときは以下の設定を使う
# logging.basicConfig(level=logging.INFO)
# logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
app = FastAPI()
app.include_router(apps.router)
app.include_router(chairs.router)
app.include_router(owners.router)


class PostInitializeRequest(BaseModel):
    payment_server: str


class PostInitializeResponse(BaseModel):
    language: str


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
