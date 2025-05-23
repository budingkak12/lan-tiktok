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
from .config_manager import save_media_path, load_media_path

app = FastAPI(title="LAN TikTok Album API")
app.state.media_path = None # Initialize media_path

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
    # os.makedirs("media", exist_ok=True) # This was for uploaded media, potentially no longer needed if /media mount is removed
    # app.mount("/media", StaticFiles(directory="media"), name="media") # Removed as per subtask instructions
    
    # Load media path from config
    app.state.media_path = load_media_path()
    if app.state.media_path and os.path.isdir(app.state.media_path):
        app.mount("/user_media_files", StaticFiles(directory=app.state.media_path), name="user_media_files")
        print(f"Serving user media from: {app.state.media_path} at /user_media_files")
    elif app.state.media_path: # Path is configured but not a valid directory
        print(f"User media path is configured to '{app.state.media_path}' but it is not a valid directory. Static files for user media not served.")
    else: # Path is not configured
        print("User media path not configured. Static files for user media not served. Please configure via POST /api/scan or GET /api/config/media_path.")

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
def scan_media_path(new_path: Optional[str] = Form(None), db: Session = Depends(get_db)):
    current_path = app.state.media_path
    
    if new_path:
        new_path = os.path.normpath(new_path)
        if not os.path.isdir(new_path):
            raise HTTPException(status_code=400, detail=f"Provided path is not a valid directory: {new_path}")
        save_media_path(new_path)
        app.state.media_path = new_path
        current_path = new_path
        print(f"Media path saved and updated to: {current_path}. A server restart may be required for changes to static file serving to take effect.")

    if not current_path:
        raise HTTPException(status_code=400, detail="Media path is not configured. Provide a 'new_path' to scan and save.")

    if not os.path.isdir(current_path):
        raise HTTPException(status_code=400, detail=f"Configured media path is not a valid directory: {current_path}. Please provide a valid 'new_path'.")

    try:
        result = scan_media_directory(current_path, db)
        return {"message": f"Scanned {result['media_count']} media files and {result['folder_count']} folders from {current_path}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Configuration endpoint to get/set media_path
@app.get("/api/config/media_path")
async def manage_media_path(new_path: Optional[str] = Query(None)):
    if new_path:
        new_path = os.path.normpath(new_path)
        if not os.path.isdir(new_path):
            raise HTTPException(status_code=400, detail=f"Provided path is not a valid directory: {new_path}")
        save_media_path(new_path)
        app.state.media_path = new_path
        return {"message": f"Media path saved and updated to: {app.state.media_path}. A server restart may be required for changes to static file serving to take effect."}
    
    if app.state.media_path:
        return {"media_path": app.state.media_path}
    else:
        return {"message": "Media path is not set. You can set it by providing the 'new_path' query parameter."}

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
