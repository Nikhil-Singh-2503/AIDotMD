from fastapi import APIRouter, Request

router = APIRouter()

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


@router.get("/meta")
def get_meta(request: Request):
    host = request.headers.get("host", "").split(":")[0]
    return {"is_local_access": host in _LOCAL_HOSTS}
