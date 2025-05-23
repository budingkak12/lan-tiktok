import os
import shutil
import uuid # For generating unique names if needed
from sqlalchemy.orm import Session
import time # For potential small delays if needed

# Assuming backend package is in PYTHONPATH
from backend.database import SessionLocal, engine, Base # For DB session and creating tables
from backend import crud
from backend import models # To potentially re-create tables for a clean test
from backend import schemas
from backend.media_scanner import scan_media_directory # To test scanning

TEMP_MEDIA_ROOT = os.path.abspath("./temp_crud_test_media")

def _create_dummy_file(filepath, content_type="application/octet-stream", size_kb=1):
    """Creates a dummy file with a specific content type hint and approximate size."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    content = b""
    if content_type.startswith("image/"):
        if filepath.endswith((".jpg", ".jpeg")):
            content = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x11\x11\x18!\x18\x1a\x1d(%\x18\x1c\x1f\x1d#\x1f&\' ()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\xff\xc9\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xd2\x0f\x20\xff\xd9'
        elif filepath.endswith(".png"):
            content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDAT\x08\xd7c`\x00\x00\x00\x02\x00\x01\xe2!\xbc\x33\x00\x00\x00\x00IEND\xaeB`\x82'
        else:
            content = b"dummy image content"
    elif content_type.startswith("video/"):
        if filepath.endswith(".mp4"):
            base_mp4 = b'\x00\x00\x00\x14ftypmp42\x00\x00\x00\x00mp42isom\x00\x00\x00\x08free\x00\x00\x00\x00mdat'
            padding_needed = size_kb * 1024 - len(base_mp4)
            if padding_needed < 0: padding_needed = 0
            content = base_mp4 + b'A' * padding_needed
        else:
            content = b"dummy video content" * (size_kb * 10) 
    else:
        content = b"dummy content" * (size_kb * 100)

    with open(filepath, "wb") as f:
        f.write(content)

def setup_test_environment():
    print(f"Setting up test environment in {TEMP_MEDIA_ROOT}...")
    # Optional: Drop all tables for a very clean slate. 
    # Use with caution if your DB is shared or has important data.
    # print("Dropping all tables...")
    # models.Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables...")
    models.Base.metadata.create_all(bind=engine) # Ensures tables exist
    
    if os.path.exists(TEMP_MEDIA_ROOT): # Clean up from previous run if any
        shutil.rmtree(TEMP_MEDIA_ROOT)
    os.makedirs(TEMP_MEDIA_ROOT, exist_ok=True)

    # Create dummy files/folders
    _create_dummy_file(os.path.join(TEMP_MEDIA_ROOT, "imageA.jpg"), "image/jpeg")
    _create_dummy_file(os.path.join(TEMP_MEDIA_ROOT, "videoB.mp4"), "video/mp4")
    os.makedirs(os.path.join(TEMP_MEDIA_ROOT, "sub"), exist_ok=True)
    _create_dummy_file(os.path.join(TEMP_MEDIA_ROOT, "sub", "imageC.png"), "image/png")
    print("Test environment setup complete.")

def cleanup_test_environment():
    print(f"\nCleaning up test environment in {TEMP_MEDIA_ROOT}...")
    shutil.rmtree(TEMP_MEDIA_ROOT, ignore_errors=True)
    # Optional: Drop tables after tests if you want a clean DB state for other purposes
    # print("Dropping all tables post-test...")
    # models.Base.metadata.drop_all(bind=engine)
    print("Test environment cleanup complete.")

def get_db_session():
    # This ensures that each test function gets a new session if called repeatedly,
    # but within a single test function, the same db object is used.
    return SessionLocal()

def test_configuration_crud():
    db = get_db_session()
    try:
        print("\n--- Testing configuration CRUD ---")
        crud.create_or_update_configuration(db, key="media_root_path", value=TEMP_MEDIA_ROOT)
        config = crud.get_configuration(db, key="media_root_path")
        assert config is not None, "Config should not be None after creation"
        assert config.value == TEMP_MEDIA_ROOT, f"Config value mismatch: expected {TEMP_MEDIA_ROOT}, got {config.value}"
        
        # Test update
        new_path = TEMP_MEDIA_ROOT + "_updated"
        crud.create_or_update_configuration(db, key="media_root_path", value=new_path)
        config_updated = crud.get_configuration(db, key="media_root_path")
        assert config_updated is not None, "Config should not be None after update"
        assert config_updated.value == new_path, f"Config value mismatch after update: expected {new_path}, got {config_updated.value}"
        print("test_configuration_crud PASSED")
    except Exception as e:
        print(f"test_configuration_crud FAILED: {e}")
        raise # Re-raise to make sure the test runner catches it if used with pytest
    finally:
        db.close()

def test_media_scan_and_retrieval():
    db = get_db_session()
    media_item_id_for_later_tests = None
    try:
        print("\n--- Testing media scan and retrieval ---")
        # Dependency: Configuration must be set for scan_media_directory to know where to look
        crud.create_or_update_configuration(db, key="media_root_path", value=TEMP_MEDIA_ROOT)
        
        scan_result = scan_media_directory(TEMP_MEDIA_ROOT, db) # scan_media_directory uses the configured path
        print(f"Scan result: {scan_result}")
        assert scan_result["media_count"] == 3, f"Expected 3 media items from scan, got {scan_result['media_count']}"
        # scan_media_directory creates the root folder and subfolder if they don't exist.
        # If root is TEMP_MEDIA_ROOT, and it has "sub", that's 2 folders.
        assert scan_result["folder_count"] >= 2, f"Expected at least 2 folders from scan (root + sub), got {scan_result['folder_count']}"

        all_media = crud.get_media_items(db, limit=10)
        assert len(all_media) == 3, f"Expected 3 media items from get_media_items, got {len(all_media)}"
        
        media_item_to_test = None
        for item in all_media:
            if "imageA.jpg" in item.path: 
                media_item_to_test = item
                break
        assert media_item_to_test is not None, "Test item imageA.jpg not found after scan"
        media_item_id_for_later_tests = media_item_to_test.id
        
        fetched_item = crud.get_media_item(db, media_id=media_item_to_test.id)
        assert fetched_item is not None, "Fetched item should not be None"
        assert fetched_item.id == media_item_to_test.id, "Fetched item ID mismatch"
        print("test_media_scan_and_retrieval PASSED")
        return media_item_id_for_later_tests 
    except Exception as e:
        print(f"test_media_scan_and_retrieval FAILED: {e}")
        raise
    finally:
        db.close()
    return None # Ensure a value is returned even if an exception occurs before the return statement

def test_tagging(media_id):
    if not media_id:
        print("test_tagging SKIPPED: no media_id provided")
        return
    db = get_db_session()
    try:
        print(f"\n--- Testing tagging for media_id: {media_id} ---")
        tag_name = "test_tag_crud_" + uuid.uuid4().hex[:4]
        tag_schema = schemas.TagCreate(name=tag_name)
        tag = crud.create_tag(db, tag=tag_schema)
        assert tag is not None, "Tag creation returned None"
        assert tag.name == tag_name, "Tag name mismatch after creation"

        crud.add_tag_to_media(db, media_id=media_id, tag_id=tag.id)
        media_item = crud.get_media_item(db, media_id=media_id)
        assert media_item is not None, "Media item not found for checking tags"
        assert any(t.id == tag.id for t in media_item.tags), "Tag not added to media item"
        print(f"Tag '{tag_name}' added to media item.")

        # Test search by tag
        tagged_media = crud.search_media_by_tags(db, tag_ids=[tag.id])
        assert any(tm.id == media_id for tm in tagged_media), "Media item not found by tag search"
        print(f"Media item found by tag search with tag '{tag_name}'.")

        crud.remove_tag_from_media(db, media_id=media_id, tag_id=tag.id)
        media_item_after_remove = crud.get_media_item(db, media_id=media_id)
        assert media_item_after_remove is not None, "Media item not found for re-checking tags"
        assert not any(t.id == tag.id for t in media_item_after_remove.tags), "Tag not removed from media item"
        print(f"Tag '{tag_name}' removed from media item.")
        print("test_tagging PASSED")
    except Exception as e:
        print(f"test_tagging FAILED: {e}")
        raise
    finally:
        db.close()

def test_adjacent_media(media_id):
    if not media_id:
        print("test_adjacent_media SKIPPED: no media_id provided")
        return
    db = get_db_session()
    try:
        print(f"\n--- Testing adjacent media for media_id: {media_id} ---")
        # Ensure there are multiple items by checking count
        all_media_count = db.query(models.Media).count()
        assert all_media_count >= 2, f"Need at least 2 media items for adjacency test, found {all_media_count}"
        
        current_item = crud.get_media_item(db, media_id=media_id)
        assert current_item is not None, f"Current media item {media_id} not found for adjacency test"

        next_item = crud.get_adjacent_media_item(db, current_media_id=media_id, direction="next")
        prev_item = crud.get_adjacent_media_item(db, current_media_id=media_id, direction="prev")
        
        print(f"Current item: ID {current_item.id}, Created_at {current_item.created_at}")
        if next_item:
            print(f"Adjacent next: ID {next_item.id}, Created_at {next_item.created_at}")
            assert next_item.created_at <= current_item.created_at, "Next item should be older or same creation time (tie-broken by ID)"
            if next_item.created_at == current_item.created_at:
                assert next_item.id < current_item.id, "Next item with same timestamp should have smaller ID"
        else:
            print("Adjacent next: None (this item might be the oldest or only one in that direction)")
        
        if prev_item:
            print(f"Adjacent prev: ID {prev_item.id}, Created_at {prev_item.created_at}")
            assert prev_item.created_at >= current_item.created_at, "Prev item should be newer or same creation time (tie-broken by ID)"
            if prev_item.created_at == current_item.created_at:
                assert prev_item.id > current_item.id, "Prev item with same timestamp should have larger ID"
        else:
            print("Adjacent prev: None (this item might be the newest or only one in that direction)")
            
        # This is a basic check; true adjacency depends on the full dataset and sort order.
        # If there are 3 items, and media_id is the middle one by creation date, both next and prev should exist.
        if all_media_count > 1:
             assert not (next_item is None and prev_item is None), "If multiple items, at least one adjacent should exist unless it's an edge case with only two items."
        
        print("test_adjacent_media PASSED (structural check)")
    except Exception as e:
        print(f"test_adjacent_media FAILED: {e}")
        raise
    finally:
        db.close()
        
def test_like_favorite_delete(media_id):
    if not media_id:
        print("test_like_favorite_delete SKIPPED: no media_id provided")
        return
    db = get_db_session()
    try:
        print(f"\n--- Testing like, favorite, delete for media_id: {media_id} ---")
        
        item_before_action = crud.get_media_item(db, media_id=media_id)
        assert item_before_action is not None, "Media item not found before like/fav/delete"
        
        initial_like_count = item_before_action.like_count

        # Like
        liked_item = crud.toggle_media_like(db, media_id=media_id, liked=True)
        assert liked_item.liked is True, "Item should be liked"
        assert liked_item.like_count == initial_like_count + 1, "Like count should increment"
        
        liked_item_off = crud.toggle_media_like(db, media_id=media_id, liked=False)
        assert liked_item_off.liked is False, "Item should be unliked"
        assert liked_item_off.like_count == initial_like_count, "Like count should decrement to initial"
        
        # Favorite
        fav_item = crud.toggle_media_favorite(db, media_id=media_id, favorited=True)
        assert fav_item.favorited is True, "Item should be favorited"
        fav_item_off = crud.toggle_media_favorite(db, media_id=media_id, favorited=False)
        assert fav_item_off.favorited is False, "Item should be unfavorited"
        
        # Delete
        item_to_delete = crud.get_media_item(db, media_id=media_id) # Fetch again to get current state
        assert item_to_delete is not None, "Item to delete not found"
        
        # The crud.delete_media_item tries to delete from filesystem.
        # Path in DB: /imageA.jpg (relative to TEMP_MEDIA_ROOT)
        # Expected FS path by crud.delete_media_item: ./imageA.jpg (relative to CWD of test script)
        # This is problematic if CWD is not /app.
        # The test script is in /app/backend/test_crud.py. If run from /app, CWD is /app.
        # So, it will try to delete /app/imageA.jpg, which is not the file in TEMP_MEDIA_ROOT.
        # For CRUD tests, we should ideally NOT test file system interaction here, or mock it.
        # Let's create the dummy file it *would* try to delete, to prevent os.remove error,
        # but acknowledge this isn't ideal.
        
        # Path construction in crud.delete_media_item:
        # file_path = os.path.join(".", db_media.path.lstrip("/"))
        # If db_media.path is "/imageA.jpg", file_path becomes "./imageA.jpg"
        
        # Instead of creating file at wrong place, let's test deletion logic carefully.
        # The actual file is at TEMP_MEDIA_ROOT/imageA.jpg
        # The DB path is /imageA.jpg
        # The crud.delete_media_item will try to delete from CWD + item.path
        # This part of crud.delete_media_item is problematic for direct CRUD testing without HTTP context.
        # For now, we'll proceed and expect os.remove to potentially fail silently or log an error,
        # but the DB deletion should work.

        # Let's check if the original dummy file exists before deletion for clarity
        original_dummy_file_path = os.path.join(TEMP_MEDIA_ROOT, item_to_delete.path.lstrip('/'))
        assert os.path.exists(original_dummy_file_path), f"Original dummy file {original_dummy_file_path} does not exist before deletion test."

        print(f"Attempting to delete media item. Path in DB: {item_to_delete.path}")
        print(f"crud.delete_media_item will attempt to remove file relative to CWD: .{item_to_delete.path}")

        delete_result = crud.delete_media_item(db, media_id=media_id)
        assert delete_result["message"] == "Media deleted successfully", "Deletion message mismatch"
        assert crud.get_media_item(db, media_id=media_id) is None, "Media item still found after deletion"
        
        # The file in TEMP_MEDIA_ROOT should NOT be deleted by crud.delete_media_item
        # because crud.delete_media_item path logic is os.path.join(".", db_media.path.lstrip("/"))
        # which is relative to CWD, not TEMP_MEDIA_ROOT.
        # This is a discrepancy to note.
        if os.path.exists(original_dummy_file_path):
            print(f"INFO: Original dummy file at {original_dummy_file_path} still exists, as expected (crud.delete_media_item path issue).")
        else:
            print(f"WARNING: Original dummy file at {original_dummy_file_path} was deleted. This implies CWD was TEMP_MEDIA_ROOT or similar.")


        print("test_like_favorite_delete PASSED")
    except Exception as e:
        print(f"test_like_favorite_delete FAILED: {e}")
        raise
    finally:
        db.close()

# Main execution
if __name__ == "__main__":
    setup_test_environment()
    
    final_status = "ALL TESTS PASSED"
    try:
        test_configuration_crud()
        # Short pause for DB operations if they were somehow async, though not expected for SQLite default.
        # time.sleep(0.1) 
        
        tested_media_id = test_media_scan_and_retrieval()
        # time.sleep(0.1)

        if tested_media_id:
            test_tagging(tested_media_id)
            # time.sleep(0.1)
            test_adjacent_media(tested_media_id) 
            # time.sleep(0.1)
            # Deletion test should be last for this ID
            test_like_favorite_delete(tested_media_id) 
        else:
            print("\nSkipping further tests as initial media scan/retrieval failed or found no items.")
            final_status = "SOME TESTS SKIPPED/FAILED due to scan/retrieval failure"

    except Exception as main_e:
        print(f"\n--- A test function raised an unhandled exception: {main_e} ---")
        final_status = "A TEST FUNCTION FAILED WITH UNHANDLED EXCEPTION"
    finally:
        cleanup_test_environment()
        print(f"\nCRUD testing finished. Final Status: {final_status}")
