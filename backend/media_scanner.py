import os
from sqlalchemy.orm import Session
from typing import Dict, List, Any
import mimetypes
import uuid
import urllib.parse

from . import models, schemas, crud

def is_media_file(file_path: str) -> bool:
    """Check if a file is a supported media type."""
    mime, _ = mimetypes.guess_type(file_path)
    if mime:
        return mime.startswith('image/') or mime.startswith('video/')
    return False

def get_media_type(file_path: str) -> str:
    """Determine if a file is an image or video."""
    mime, _ = mimetypes.guess_type(file_path)
    if mime:
        if mime.startswith('image/'):
            return 'image'
        elif mime.startswith('video/'):
            return 'video'
    return 'unknown'

def normalize_path(path: str) -> str:
    """Normalize a path for consistent storage and comparison."""
    return os.path.normpath(path)

def scan_media_directory(root_path: str, db: Session) -> Dict[str, Any]:
    """
    Scan a directory for media files and folders, adding them to the database.
    Returns statistics about the scan.
    """
    # Normalize the root path
    root_path = normalize_path(root_path)
    
    if not os.path.exists(root_path):
        raise ValueError(f"Path does not exist: {root_path}")
    
    stats = {
        "media_count": 0,
        "folder_count": 0,
        "errors": []
    }
    
    # Process the root folder
    root_folder_db = db.query(models.Folder).filter(models.Folder.path == root_path).first()
    if not root_folder_db:
        root_name = os.path.basename(root_path.rstrip('/\\'))
        root_folder = schemas.FolderCreate(
            name=root_name or "Root",
            path=root_path,
            parent_id=None
        )
        root_folder_db = crud.create_folder(db, root_folder)
        stats["folder_count"] += 1
    
    # Walk through the directory
    for dirpath, dirnames, filenames in os.walk(root_path):
        # Normalize the current path
        current_path = normalize_path(dirpath)
        
        # Get or create folder for current directory
        current_folder_db = db.query(models.Folder).filter(models.Folder.path == current_path).first()
        if not current_folder_db:
            parent_path = normalize_path(os.path.dirname(current_path))
            parent_folder_db = db.query(models.Folder).filter(models.Folder.path == parent_path).first()
            
            folder = schemas.FolderCreate(
                name=os.path.basename(dirpath),
                path=current_path,
                parent_id=parent_folder_db.id if parent_folder_db else None
            )
            current_folder_db = crud.create_folder(db, folder)
            stats["folder_count"] += 1
        
        # Process media files in current directory
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            
            if is_media_file(file_path):
                try:
                    # Convert backslashes to forward slashes for web paths
                    # 使用 urllib.parse.quote 来处理中文和特殊字符
                    rel_path = os.path.relpath(file_path, '.')
                    web_path = "/" + rel_path.replace('\\', '/')
                    
                    # 检查文件是否已存在于数据库中
                    db_media = db.query(models.Media).filter(models.Media.path == web_path).first  '/')
                    
                    # 检查文件是否已存在于数据库中
                    db_media = db.query(models.Media).filter(models.Media.path == web_path).first()
                    
                    if not db_media:
                        try:
                            media_type = get_media_type(file_path)
                            file_size = os.path.getsize(file_path)
                            
                            media_item = schemas.MediaItemCreate(
                                type=media_type,
                                path=web_path,
                                title=os.path.splitext(filename)[0],
                                size=file_size,
                                folder_id=current_folder_db.id
                            )
                            crud.create_media_item(db, media_item)
                            stats["media_count"] += 1
                        except Exception as e:
                            stats["errors"].append(f"Error processing {file_path}: {str(e)}")
    
    return stats
