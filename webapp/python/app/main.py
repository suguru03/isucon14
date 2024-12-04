import subprocess
from http import HTTPStatus

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text

from . import app_handlers, chair_handlers, internal_handlers, owner_handlers
from .sql import engine

app = FastAPI()
app.include_router(app_handlers.router)
app.include_router(chair_handlers.router)
app.include_router(internal_handlers.router)
app.include_router(owner_handlers.router)


class PostInitializeRequest(BaseModel):
    payment_server: str


class PostInitializeResponse(BaseModel):
    language: str


@app.exception_handler(HTTPStatus.INTERNAL_SERVER_ERROR)
def internal_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR, content={"message": str(exc)}
    )


@app.exception_handler(HTTPException)
def custom_http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})


@app.post("/api/initialize")
def post_initialize(req: PostInitializeRequest) -> PostInitializeResponse:
    result = subprocess.run(
        "../sql/init.sh", stdout=subprocess.PIPE, stderr=subprocess.STDOUT
    )
    if result.returncode != 0:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"failed to initialize: {result.stdout.decode()}",
        )

    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE settings SET value = :value WHERE name = 'payment_gateway_url'",
            ),
            {"value": req.payment_server},
        )

    return PostInitializeResponse(language="python")
