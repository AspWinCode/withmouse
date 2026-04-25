import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException
from app.core.config import settings

ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp"},
    "document": {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".zip"},
    "video": {".mp4", ".webm", ".mov"},
    "any": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx",
             ".xls", ".xlsx", ".csv", ".txt", ".zip", ".mp4", ".webm", ".mov"},
}

MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


async def save_upload_file(
    upload_file: UploadFile,
    subfolder: str,
    allowed_type: str = "any",
) -> tuple[str, str]:
    ext = os.path.splitext(upload_file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS.get(allowed_type, ALLOWED_EXTENSIONS["any"]):
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый тип файла. Разрешены: {', '.join(ALLOWED_EXTENSIONS[allowed_type])}",
        )

    content = await upload_file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Файл слишком большой. Максимум: {settings.MAX_FILE_SIZE_MB} МБ",
        )

    filename = f"{uuid.uuid4()}{ext}"
    dir_path = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, filename)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return os.path.join(subfolder, filename).replace("\\", "/"), upload_file.filename or filename


def delete_file(relative_path: str) -> None:
    if not relative_path:
        return
    full_path = os.path.join(settings.UPLOAD_DIR, relative_path)
    if os.path.exists(full_path):
        os.remove(full_path)
