import os
import binascii


def secure_random_str(b: int) -> str:
    random_bytes: bytes = os.urandom(b)
    return binascii.hexlify(random_bytes).decode("utf-8")
