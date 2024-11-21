import time
from collections.abc import Callable
from http import HTTPStatus

import urllib3
from pydantic import BaseModel

from isuride.app.models import Ride

ERRORED_UPSTREAM = "errored upstream"


class PaymentGatewayPostPaymentRequest(BaseModel):
    amount: int


class PaymentGatewayGetPaymentsResponseOne(BaseModel):
    amount: int
    status: str


def request_payment_gateway_post_payment(
    payment_gateway_url: str,
    token: str,
    param: PaymentGatewayPostPaymentRequest,
    retrieve_rides_order_by_created_at_asc: Callable[[], list[Ride]],
) -> None:
    # 失敗したらとりあえずリトライ
    # FIXME: 社内決済マイクロサービスのインフラに異常が発生していて、同時にたくさんリクエストすると変なことになる可能性あり
    retry = 0
    while True:
        res = urllib3.request(
            "POST",
            payment_gateway_url + "/payments",
            json=param.model_dump(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )

        if res.status != HTTPStatus.NO_CONTENT:
            # エラーが返ってきても成功している場合があるので、社内決済マイクロサービスに問い合わせ
            get_res = urllib3.request(
                "GET",
                payment_gateway_url + "/payments",
                headers={
                    "Authorization": f"Bearer {token}",
                },
            )

            # GET /payments は障害と関係なく200が返るので、200以外は回復不能なエラーとする
            if get_res.status != HTTPStatus.OK:
                raise RuntimeError(
                    f"[GET /payments] unexpected status code ({get_res.status})"
                )
            payments = [
                PaymentGatewayGetPaymentsResponseOne(**item) for item in get_res.json()
            ]

            rides = retrieve_rides_order_by_created_at_asc()

            if len(rides) != len(payments):
                raise RuntimeError(
                    f"unexpected number of payments: {len(rides)}  != {len(payments)}. {ERRORED_UPSTREAM}",
                )

        if retry < 5:
            retry += 1
            time.sleep(0.1)
            continue

        break
