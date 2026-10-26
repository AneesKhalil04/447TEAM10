from fastapi import APIRouter, UploadFile
from fastapi.responses import JSONResponse

from app.schemas.uploads import UploadErrors, UploadResponse
from app.services.uploads import MAX_FILE_SIZE, InvalidUpload, validate_csv

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("/validate", response_model=UploadResponse, responses={
    400: {"model": UploadErrors}, 413: {"model": UploadErrors},
})
async def validate_upload(file: UploadFile) -> UploadResponse | JSONResponse:
    try:
        if not (file.filename or "").lower().endswith(".csv"):
            return JSONResponse(status_code=400, content={
                "errors": [{"row": None, "message": "Please upload a .csv file."}],
            })
        content = await file.read(MAX_FILE_SIZE + 1)
        if len(content) > MAX_FILE_SIZE:
            return JSONResponse(status_code=413, content={
                "errors": [{"row": None, "message": "The CSV must be 5 MB or smaller."}],
            })
        try:
            return validate_csv(content)
        except InvalidUpload as exc:
            return JSONResponse(
                status_code=400, content=UploadErrors(errors=exc.errors).model_dump(),
            )
    finally:
        await file.close()
