import binascii
import os

from .models import Ride

INITIAL_FARE: int = 500
FARE_PER_DISTANCE: int = 100


def secure_random_str(b: int) -> str:
    random_bytes: bytes = os.urandom(b)
    return binascii.hexlify(random_bytes).decode("utf-8")


def calculate_fare(pickup_latitude, pickup_longitude, dest_latitude, dest_longitude):
    metered_fare = FARE_PER_DISTANCE * calculate_distance(
        pickup_latitude, pickup_longitude, dest_latitude, dest_longitude
    )
    return INITIAL_FARE + metered_fare


def calculate_distance(
    a_latitude: int, a_longitude: int, b_latitude: int, b_longitude: int
) -> int:
    return abs(a_latitude - b_latitude) + abs(a_longitude - b_longitude)


def calculate_sale(ride: Ride) -> int:
    return calculate_fare(
        ride.pickup_latitude,
        ride.pickup_longitude,
        ride.destination_longitude,
        ride.destination_longitude,
    )


def sum_sales(rides: list[Ride]) -> int:
    sale = 0
    for ride in rides:
        sale += calculate_sale(ride)
    return sale
