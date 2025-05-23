from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime
import uuid
import urllib.parse

from . import models, schemas, crud
from .database import engine, SessionLocal, get_db
from .media_scanner import scan_media_directory

app = FastAPI(title="LAN TikTok Album API")

# 配置 CORS - 更新为更严格的配置
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# 如果设置了 CORS_ORIGINS 环境变量，则使用它
if os.environ.get("CORS_ORIGINS"):
    origins.extend(os.environ.get("CORS_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，简化开发
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Mount media directory for serving files
@app.on_event("startup")
async def startup_event():
    os.makedirs("media", exist_ok=True)
    app.mount("/media", StaticFiles(directory="media"), name="media")

# API endpoints
@app.get("/")
def read_root():
    return {"message": "LAN TikTok Album API"}

# Media endpoints
@app.get("/api/media", response_model=List[schemas.MediaItem])
def get_all_media(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: str = "recent",
    db: Session = Depends(get_db)
):
    return crud.get_media_items(db, skip=skip, limit=limit, sort_by=sort_by)

@app.get("/api/media/{media_id}", response_model=schemas.MediaItem)
def get_media(media_id: str = Path(...), db: Session = Depends(get_db)):
    # Decode the media_id if it's URL encoded
    media_id = urllib.parse.unquote(media_id)
    db_media = crud.get_media_item(db, media_id=media_id)
    if db_media is None:
        raise HTTPException(status_code=404, detail="Media not found")
    return db_media

@app.delete("/api/media/{media_id}")
def delete_media(media_id: str = Path(...), db: Session = Depends(get_db)):
    # Decode the media_id if it's URL encoded
    media_id = urllib.parse.unquote(media_id)
    return crud.delete_media_item(db, media_id=media_id)

@app.post("/api/media/{media_id}/like")
def toggle_like(media_id: str = Path(...), liked: bool = Form(...), db: Session = Depends(get_db)):
    # Decode the media_id if it's URL encoded
    media_id = urllib.parse.unquote(media_id)
    return crud.toggle_media_like(db, media_id=media_id, liked=liked)

@app.post("/api/media/{media_id}/favorite")
def toggle_favorite(media_id: str = Path(...), favorited: bool = Form(...), db: Session = Depends(get_db)):
    # Decode the media_id if it's URL encoded
    media_id = urllib.parse.unquote(media_id)
    return crud.toggle_media_favorite(db, media_id=media_id, favorited=favorited)

# Tag endpoints
@app.get("/api/tags", response_model=List[schemas.Tag])
def get_all_tags(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_tags(db, skip=skip, limit=limit)

@app.post("/api/tags", response_model=schemas.Tag)
def create_tag(tag: schemas.TagCreate, db: Session = Depends(get_db)):
    return crud.create_tag(db, tag=tag)

@app.post("/api/media/{media_id}/tags/{tag_id}")
def add_tag_to_media(
    media_id: str = Path(...), 
    tag_id: str = Path(...), 
    db: Session = Depends(get_db)
):
    # Decode the IDs if they're URL encoded
    media_id = urllib.parse.unquote(media_id)
    tag_id = urllib.parse.unquote(tag_id)
    return crud.add_tag_to_media(db, media_id=media_id, tag_id=tag_id)

@app.delete("/api/media/{media_id}/tags/{tag_id}")
def remove_tag_from_media(
    media_id: str = Path(...), 
    tag_id: str = Path(...), 
    db: Session = Depends(get_db)
):
    # Decode the IDs if they're URL encoded
    media_id = urllib.parse.unquote(media_id)
    tag_id = urllib.parse.unquote(tag_id)
    return crud.remove_tag_from_media(db, media_id=media_id, tag_id=tag_id)

# Folder endpoints
@app.get("/api/folders", response_model=List[schemas.Folder])
def get_root_folders(db: Session = Depends(get_db)):
    return crud.get_root_folders(db)

@app.get("/api/folders/{folder_id}", response_model=schemas.Folder)
def get_folder(folder_id: str = Path(...), db: Session = Depends(get_db)):
    # Decode the folder_id if it's URL encoded
    folder_id = urllib.parse.unquote(folder_id)
    db_folder = crud.get_folder(db, folder_id=folder_id)
    if db_folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    return db_folder

@app.get("/api/folders/{folder_id}/subfolders", response_model=List[schemas.Folder])
def get_subfolders(folder_id: str = Path(...), db: Session = Depends(get_db)):
    # Decode the folder_id if it's URL encoded
    folder_id = urllib.parse.unquote(folder_id)
    return crud.get_subfolders(db, parent_id=folder_id)

@app.get("/api/folders/{folder_id}/media", response_model=List[schemas.MediaItem])
def get_folder_media(folder_id: str = Path(...), db: Session = Depends(get_db)):
    # Decode the folder_id if it's URL encoded
    folder_id = urllib.parse.unquote(folder_id)
    return crud.get_folder_media(db, folder_id=folder_id)

@app.get("/api/folders/{folder_id}/breadcrumb", response_model=List[schemas.Folder])
def get_folder_breadcrumb(folder_id: str = Path(...), db: Session = Depends(get_db)):
    # Decode the folder_id if it's URL encoded
    folder_id = urllib.parse.unquote(folder_id)
    return crud.get_folder_breadcrumb(db, folder_id=folder_id)

# Search endpoints
@app.get("/api/search/tags", response_model=List[schemas.MediaItem])
def search_by_tags(tag_ids: List[str] = Query(None), db: Session = Depends(get_db)):
    if not tag_ids:
        return []
    # Decode the tag_ids if they're URL encoded
    tag_ids = [urllib.parse.unquote(tag_id) for tag_id in tag_ids]
    return crud.search_media_by_tags(db, tag_ids=tag_ids)

# Media scanning endpoint
@app.post("/api/scan")
def scan_media(path: str = Form(...), db: Session = Depends(get_db)):
    try:
        # Normalize path to handle different OS path formats
        path = os.path.normpath(path)
        
        # Validate path exists
        if not os.path.exists(path):
            raise HTTPException(status_code=400, detail=f"Path does not exist: {path}")
        
        # Validate path is a directory
        if not os.path.isdir(path):
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {path}")
        
        result = scan_media_directory(path, db)
        return {"message": f"Scanned {result['media_count']} media files and {result['folder_count']} folders"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Upload endpoint
@app.post("/api/upload/{folder_id}")
async def upload_file(
    folder_id: str = Path(...), 
    file: UploadFile = File(...), 
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    # Decode the folder_id if it's URL encoded
    folder_id = urllib.parse.unquote(folder_id)
    
    # Get folder
    folder = crud.get_folder(db, folder_id=folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Determine file type
    file_ext = os.path.splitext(file.filename)[1].lower()
    media_type = "image" if file_ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"] else "video"
    
    # Create unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join("media", unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create media item in database
    media_create = schemas.MediaItemCreate(
        type=media_type,
        path=f"/media/{unique_filename}",
        title=title or file.filename,
        size=os.path.getsize(file_path),
        folder_id=folder_id
    )
    
    return crud.create_media_item(db, media_item=media_create)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
