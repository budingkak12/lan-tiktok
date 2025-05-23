import os
from sqlalchemy.orm import Session
from typing import Dict, List, Any
import mimetypes
import uuid
import urllib.parse
import logging

# Configure basic logging if not configured elsewhere in the app
# logging.basicConfig(level=logging.INFO) # Or use FastAPI's logger
logger = logging.getLogger(__name__)

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
    logger.info(f"Starting media scan in directory: {root_path}")
    
    if not os.path.exists(root_path):
        # This case should ideally be caught by the API endpoint before calling this function.
        # However, it's good to have a check here too.
        logger.error(f"Root path does not exist: {root_path}")
        raise ValueError(f"Path does not exist: {root_path}")
    
    stats = {
        "media_count": 0,
        "folder_count": 0,
        "errors": []
    }
    
    # Process the root folder itself
    # The root folder's path in the DB will be the `root_path` itself.
    # Its name will be the basename of `root_path` or "Root" if `root_path` is like `/`.
    root_folder_db = db.query(models.Folder).filter(models.Folder.path == root_path).first()
    if not root_folder_db:
        root_name = os.path.basename(root_path.rstrip('/\\')) or "Root"
        root_folder_schema = schemas.FolderCreate(
            name=root_name,
            path=root_path, # Store the normalized absolute path for the root
            parent_id=None
        )
        try:
            root_folder_db = crud.create_folder(db, root_folder_schema)
            stats["folder_count"] += 1
            logger.info(f"Created root folder entry: {root_path}")
        except Exception as e:
            error_message = f"Error creating root folder entry for {root_path}: {str(e)}"
            stats["errors"].append(error_message)
            logger.error(error_message)
            # If root folder creation fails, we probably shouldn't proceed.
            return stats

    # Walk through the directory
    for dirpath, dirnames, filenames in os.walk(root_path):
        current_normalized_dirpath = normalize_path(dirpath)
        logger.info(f"Processing folder: {current_normalized_dirpath}")

        # Determine parent folder for the current dirpath
        parent_folder_db_id = None
        if current_normalized_dirpath == root_path:
            # The current directory is the root path itself. Its DB entry is root_folder_db.
            current_folder_db = root_folder_db
        else:
            # This is a subdirectory. Its parent is dirname(current_normalized_dirpath).
            parent_dir_path = normalize_path(os.path.dirname(current_normalized_dirpath))
            # The parent_folder_db should already exist because os.walk is top-down.
            parent_folder_db = db.query(models.Folder).filter(models.Folder.path == parent_dir_path).first()
            if parent_folder_db:
                parent_folder_db_id = parent_folder_db.id
            else:
                # This should ideally not happen if os.walk is top-down and we process parent first.
                # However, as a fallback, or if root_path was a symlink that changed, log and skip.
                error_message = f"Could not find parent folder in DB for {current_normalized_dirpath} (expected parent path {parent_dir_path}). Skipping folder."
                stats["errors"].append(error_message)
                logger.error(error_message)
                continue # Skip this folder and its contents

            # Get or create folder for current directory
            current_folder_db = db.query(models.Folder).filter(models.Folder.path == current_normalized_dirpath).first()
            if not current_folder_db:
                folder_schema = schemas.FolderCreate(
                    name=os.path.basename(current_normalized_dirpath),
                    path=current_normalized_dirpath, # Store the normalized absolute path
                    parent_id=parent_folder_db_id
                )
                try:
                    current_folder_db = crud.create_folder(db, folder_schema)
                    stats["folder_count"] += 1
                    logger.info(f"Created folder entry: {current_normalized_dirpath}")
                except Exception as e:
                    error_message = f"Error creating folder entry for {current_normalized_dirpath}: {str(e)}"
                    stats["errors"].append(error_message)
                    logger.error(error_message)
                    continue # Skip this folder if its DB entry cannot be created
        
        # Process media files in current directory
        for filename in filenames:
            file_path = normalize_path(os.path.join(current_normalized_dirpath, filename))
            
            if is_media_file(file_path):
                try:
                    # web_path is relative to the root_path, starting with a '/'
                    rel_path = os.path.relpath(file_path, root_path)
                    web_path = "/" + rel_path.replace('\\', '/')
                    
                    # Check if media already exists by this relative path
                    db_media = db.query(models.Media).filter(models.Media.path == web_path).first()
                    
                    if not db_media:
                        try:
                            media_type = get_media_type(file_path)
                            file_size = os.path.getsize(file_path) # Can raise FileNotFoundError or other OS errors
                            
                            media_item_schema = schemas.MediaItemCreate(
                                type=media_type,
                                path=web_path, # Store the relative path
                                title=os.path.splitext(filename)[0],
                                size=file_size,
                                folder_id=current_folder_db.id # current_folder_db is from the outer scope
                            )
                            crud.create_media_item(db, media_item_schema)
                            stats["media_count"] += 1
                            logger.info(f"Added new media: {file_path} as {web_path}")
                        except (IOError, OSError, FileNotFoundError, PermissionError) as e: # Catch specific OS errors for file size, etc.
                            error_message = f"Error accessing properties for {file_path}: {str(e)}"
                            stats["errors"].append(error_message)
                            logger.error(error_message) # Log specific error for this file
                        except Exception as e: # Catch other unexpected errors during item creation
                            error_message = f"Unexpected error creating media item for {file_path}: {str(e)}"
                            stats["errors"].append(error_message)
                            logger.error(error_message)
                except Exception as e: # Catch errors like invalid characters in path for relpath, etc.
                    error_message = f"Error determining relative path or pre-check for {file_path}: {str(e)}"
                    stats["errors"].append(error_message)
                    logger.error(error_message) # Log general error for this file path
            # else:
                # logger.debug(f"Skipping non-media file: {file_path}")
    
    logger.info(f"Media scan completed for {root_path}. Stats: {stats}")
    return stats
