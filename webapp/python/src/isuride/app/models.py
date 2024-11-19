from pydantic import BaseModel
from datetime import datetime


class User(BaseModel):
    id: str
    username: str
    firstname: str
    lastname: str
    date_of_birth: str
    access_token: str
    invitation_code: str
    created_at: datetime
    updated_at: datetime


class Ride(BaseModel):
    id: str
    user_id: str
    chair_id: str | None
    pickup_latitude: int
    pickup_longitude: int
    destination_latitude: int
    destination_longitude: int
    evaluation: int | None
    created_at: datetime
    updated_at: datetime
