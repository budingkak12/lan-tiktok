import os
import shutil
import time
import uuid
import mimetypes 
import urllib.parse

from fastapi.testclient import TestClient
# Assuming 'app' is the FastAPI instance in backend/main.py
# Adjust the import path if your app instance is located elsewhere.
from backend.main import app

# Initialize TestClient
client = TestClient(app)

TEMP_MEDIA_ROOT = os.path.abspath("./temp_test_media_root")

# Store some state for dependent tests
media_items_cache = [] 
tags_cache = {} 
folders_cache = {} 

def _create_dummy_file(filepath, content_type="application/octet-stream", size_kb=1):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    content = b""
    if content_type.startswith("image/"):
        if filepath.endswith((".jpg", ".jpeg")):
            content = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x11\x11\x18!\x18\x1a\x1d(%\x18\x1c\x1f\x1d#\x1f&\' ()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\xff\xc9\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xd2\x0f\x20\xff\xd9'
        elif filepath.endswith(".png"):
            content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDAT\x08\xd7c`\x00\x00\x00\x02\x00\x01\xe2!\xbc\x33\x00\x00\x00\x00IEND\xaeB`\x82'
        else: content = b"dummy image content"
    elif content_type.startswith("video/"):
        if filepath.endswith(".mp4"):
            base_mp4 = b'\x00\x00\x00\x14ftypmp42\x00\x00\x00\x00mp42isom\x00\x00\x00\x08free\x00\x00\x00\x00mdat'
            padding_needed = size_kb * 1024 - len(base_mp4)
            if padding_needed < 0: padding_needed = 0
            content = base_mp4 + b'A' * padding_needed
        else: content = b"dummy video content" * (size_kb * 10)
    else: content = b"dummy content" * (size_kb * 100)
    with open(filepath, "wb") as f: f.write(content)

def setup_test_environment():
    print(f"Setting up test environment in {TEMP_MEDIA_ROOT}...")
    if os.path.exists(TEMP_MEDIA_ROOT): shutil.rmtree(TEMP_MEDIA_ROOT)
    os.makedirs(TEMP_MEDIA_ROOT)
    _create_dummy_file(os.path.join(TEMP_MEDIA_ROOT, "image.jpg"), "image/jpeg", size_kb=10)
    _create_dummy_file(os.path.join(TEMP_MEDIA_ROOT, "video.mp4"), "video/mp4", size_kb=100) 
    os.makedirs(os.path.join(TEMP_MEDIA_ROOT, "subfolder"), exist_ok=True)
    _create_dummy_file(os.path.join(TEMP_MEDIA_ROOT, "subfolder", "image2.png"), "image/png", size_kb=5)
    _create_dummy_file(os.path.join(TEMP_MEDIA_ROOT, "video_small.mp4"), "video/mp4", size_kb=1)
    print("Test environment setup complete.")

def cleanup_test_environment():
    print(f"\nCleaning up test environment in {TEMP_MEDIA_ROOT}...")
    if os.path.exists(TEMP_MEDIA_ROOT): shutil.rmtree(TEMP_MEDIA_ROOT)
    print("Test environment cleanup complete.")

def test_health_check():
    print("\n--- Testing Health Check ---")
    response = client.get("/")
    assert response.status_code == 200, f"Health check failed: {response.text}"
    assert response.json().get("message") == "LAN TikTok Album API"
    print("SUCCESS: Health check passed.")

def test_config_endpoints():
    print("\n--- Testing Config Endpoints ---")
    path_to_set = TEMP_MEDIA_ROOT
    response_post = client.post("/api/config/media_path", json={"key": "media_root_path", "value": path_to_set})
    assert response_post.status_code == 200, f"Set media path failed: {response_post.text}"
    assert response_post.json().get("value") == path_to_set
    print("SUCCESS: Set media path config passed.")

    response_get = client.get("/api/config/media_path")
    assert response_get.status_code == 200, f"Get media path failed: {response_get.text}"
    assert response_get.json().get("value") == path_to_set
    print("SUCCESS: Get media path config passed.")

def test_scan_media():
    print("\n--- Testing Scan Media ---")
    response = client.post("/api/scan") # No body needed as per current main.py
    assert response.status_code == 200, f"Scan media failed: {response.text}"
    scan_message = response.json()['message']
    assert "Scanned" in scan_message
    print(f"SUCCESS: Scan media request passed. Response: {scan_message}")
    # Expected: 4 media files, 2 folders
    assert "4 media files" in scan_message, f"Expected 4 media files in scan message: {scan_message}"
    assert "2 folders" in scan_message, f"Expected 2 folders in scan message: {scan_message}"
    print("INFO: Scan count matches expected (4 media, 2 folders).")
    time.sleep(0.1) # Short delay for DB operations to settle if any were async (though they are not here)

def test_media_endpoints():
    print("\n--- Testing Media Endpoints ---")
    global media_items_cache
    response_get_all = client.get("/api/media?limit=20")
    assert response_get_all.status_code == 200, f"Get all media failed: {response_get_all.text}"
    assert isinstance(response_get_all.json(), list)
    media_items_cache = sorted(response_get_all.json(), key=lambda x: x['path'])
    print(f"SUCCESS: Get all media passed. Found {len(media_items_cache)} items.")
    assert len(media_items_cache) == 4, f"Expected 4 media items after scan, found {len(media_items_cache)}"

    first_item = media_items_cache[0]
    item_id_encoded = urllib.parse.quote(first_item["id"])
    response_get_one = client.get(f"/api/media/{item_id_encoded}")
    assert response_get_one.status_code == 200, f"Get media item by ID ({first_item['id']}) failed: {response_get_one.text}"
    assert response_get_one.json()["id"] == first_item["id"]
    print(f"SUCCESS: Get media item by ID ({first_item['id']}) passed.")

    for item in media_items_cache:
        content_id_encoded = urllib.parse.quote(item["id"])
        content_path = item["path"] 
        full_original_path = os.path.join(TEMP_MEDIA_ROOT, content_path.lstrip('/'))
        expected_content_type, _ = mimetypes.guess_type(full_original_path)
        if not expected_content_type: 
            if item["path"].endswith((".jpg", ".jpeg")): expected_content_type = "image/jpeg"
            elif item["path"].endswith(".png"): expected_content_type = "image/png"
            elif item["path"].endswith(".mp4"): expected_content_type = "video/mp4"
        
        print(f"Testing content for: {content_path} (ID: {item['id']}), Type: {item['type']}, Expected MIME: {expected_content_type}")
        response_content = client.get(f"/api/media/content/{content_id_encoded}")
        api_content_type = response_content.headers.get("content-type","")
        assert response_content.status_code == 200, f"Get content for {content_path} failed: {response_content.text}"
        assert api_content_type.startswith(expected_content_type), f"Content-Type mismatch for {content_path}. Got {api_content_type}, expected {expected_content_type}"
        print(f"SUCCESS: Get content for {content_path} passed. Content-Type: {api_content_type}")

        if item["type"] == "video":
            headers_range = {"Range": "bytes=0-99"} 
            response_content_range = client.get(f"/api/media/content/{content_id_encoded}", headers=headers_range)
            api_content_type_range = response_content_range.headers.get("content-type","")
            assert response_content_range.status_code in [200, 206], f"Video range request for {content_path} failed: {response_content_range.text}"
            assert api_content_type_range.startswith(expected_content_type), f"Video range Content-Type mismatch for {content_path}. Got {api_content_type_range}, expected {expected_content_type}"
            print(f"SUCCESS: Get video content with range ({content_path}) passed. Status: {response_content_range.status_code}, Content-Type: {api_content_type_range}")
            if response_content_range.status_code == 206: print(f"INFO: Received 206 Partial Content for video {content_path} (size {item['size']}).")
            else: print(f"INFO: Received 200 OK for ranged request on video {content_path} (size {item['size']}). Expected for small files.")

def test_tag_endpoints(media_id_to_tag):
    print("\n--- Testing Tag Endpoints ---")
    assert media_id_to_tag, "media_id_to_tag cannot be None for tag tests"
    media_id_encoded = urllib.parse.quote(media_id_to_tag)
    global tags_cache
    tag_name = f"test_tag_{uuid.uuid4().hex[:6]}"

    response_create_tag = client.post("/api/tags", json={"name": tag_name})
    assert response_create_tag.status_code == 200, f"Create tag failed: {response_create_tag.text}"
    created_tag = response_create_tag.json()
    assert created_tag.get("name") == tag_name
    tag_id = created_tag["id"]
    tag_id_encoded = urllib.parse.quote(tag_id)
    tags_cache[tag_name] = tag_id
    print(f"SUCCESS: Create tag '{tag_name}' (ID: {tag_id}) passed.")

    response_get_tags = client.get("/api/tags")
    assert response_get_tags.status_code == 200
    assert any(t["id"] == tag_id for t in response_get_tags.json()), "Newly created tag not found in /api/tags"
    print(f"SUCCESS: Get all tags lists new tag '{tag_name}'.")

    response_add_tag = client.post(f"/api/media/{media_id_encoded}/tags/{tag_id_encoded}")
    assert response_add_tag.status_code == 200, f"Add tag to media failed: {response_add_tag.text}"
    print(f"SUCCESS: Add tag '{tag_name}' to media '{media_id_to_tag}' passed.")

    response_get_media = client.get(f"/api/media/{media_id_encoded}")
    assert response_get_media.status_code == 200
    assert any(t["id"] == tag_id for t in response_get_media.json().get("tags", [])), "Tag not found on media item after adding"
    print(f"SUCCESS: Media item '{media_id_to_tag}' shows tag '{tag_name}'.")
    
    response_remove_tag = client.delete(f"/api/media/{media_id_encoded}/tags/{tag_id_encoded}")
    assert response_remove_tag.status_code == 200, f"Remove tag from media failed: {response_remove_tag.text}"
    print(f"SUCCESS: Remove tag '{tag_name}' from media '{media_id_to_tag}' passed.")

    response_get_media_after_delete = client.get(f"/api/media/{media_id_encoded}")
    assert response_get_media_after_delete.status_code == 200
    assert not any(t["id"] == tag_id for t in response_get_media_after_delete.json().get("tags", [])), "Tag still present on media after removal"
    print(f"SUCCESS: Tag '{tag_name}' correctly removed from media '{media_id_to_tag}'.")

def test_search_endpoints():
    print("\n--- Testing Search Endpoints ---")
    assert media_items_cache, "media_items_cache is empty, cannot run search tests"
    media_to_search_id = media_items_cache[0]["id"]
    media_to_search_id_encoded = urllib.parse.quote(media_to_search_id)
    tag_name_for_search = f"search_tag_{uuid.uuid4().hex[:6]}"
    tag_id_to_search = None
    tag_id_to_search_encoded = None
    
    try:
        response_create_tag = client.post("/api/tags", json={"name": tag_name_for_search})
        assert response_create_tag.status_code == 200
        tag_id_to_search = response_create_tag.json()["id"]
        tag_id_to_search_encoded = urllib.parse.quote(tag_id_to_search)

        response_add_tag = client.post(f"/api/media/{media_to_search_id_encoded}/tags/{tag_id_to_search_encoded}")
        assert response_add_tag.status_code == 200
        print(f"INFO (Search): Added tag '{tag_name_for_search}' (ID: {tag_id_to_search}) to media '{media_to_search_id}'.")
        time.sleep(0.1)

        response_search = client.get(f"/api/search/tags?tag_ids={tag_id_to_search_encoded}")
        assert response_search.status_code == 200
        search_results = response_search.json()
        assert any(item["id"] == media_to_search_id for item in search_results), f"Search for tag ID {tag_id_to_search} did not return item {media_to_search_id}"
        print(f"SUCCESS: Search for tag ID '{tag_id_to_search}' returned the tagged media item '{media_to_search_id}'.")
    finally: 
        if tag_id_to_search_encoded and media_to_search_id_encoded:
            client.delete(f"/api/media/{media_to_search_id_encoded}/tags/{tag_id_to_search_encoded}")
            print(f"INFO (Search Cleanup): Cleaned up tag '{tag_name_for_search}' from media '{media_to_search_id}'.")

def test_folder_endpoints():
    print("\n--- Testing Folder Endpoints ---")
    global folders_cache
    response_get_root_folders = client.get("/api/folders")
    assert response_get_root_folders.status_code == 200
    assert isinstance(response_get_root_folders.json(), list)
    root_folders = response_get_root_folders.json()
    print(f"SUCCESS: Get root folders passed. Found {len(root_folders)} root folder(s).")

    main_root_folder_db = next((f for f in root_folders if f["path"] == TEMP_MEDIA_ROOT), None)
    assert main_root_folder_db, f"Main scanned root folder '{TEMP_MEDIA_ROOT}' not found in root folders list: {root_folders}"
    root_folder_id = main_root_folder_db["id"]
    root_folder_id_encoded = urllib.parse.quote(root_folder_id)
    folders_cache[TEMP_MEDIA_ROOT] = root_folder_id
    print(f"INFO: Main test root folder found: ID '{root_folder_id}', Path '{main_root_folder_db['path']}'.")

    response_get_folder = client.get(f"/api/folders/{root_folder_id_encoded}")
    assert response_get_folder.status_code == 200
    assert response_get_folder.json()["id"] == root_folder_id
    print(f"SUCCESS: Get folder by ID ({root_folder_id}) passed.")

    response_subfolders = client.get(f"/api/folders/{root_folder_id_encoded}/subfolders")
    assert response_subfolders.status_code == 200
    subfolders_list = response_subfolders.json()
    assert isinstance(subfolders_list, list)
    print(f"SUCCESS: Get subfolders for root passed. Found {len(subfolders_list)} subfolder(s).")
    
    expected_subfolder_path = os.path.join(TEMP_MEDIA_ROOT, "subfolder")
    subfolder_db = next((sf for sf in subfolders_list if sf["name"] == "subfolder" and sf["path"] == expected_subfolder_path), None)
    assert subfolder_db, f"Expected subfolder 'subfolder' with path '{expected_subfolder_path}' not found."
    folders_cache[expected_subfolder_path] = subfolder_db["id"]
    print(f"INFO: Verified 'subfolder' (Path: {expected_subfolder_path}) is listed under root. ID: {subfolder_db['id']}")
    assert len(subfolders_list) == 1, f"Expected 1 subfolder, found {len(subfolders_list)}"


    response_folder_media = client.get(f"/api/folders/{root_folder_id_encoded}/media")
    assert response_folder_media.status_code == 200
    media_in_root_folder = response_folder_media.json()
    assert isinstance(media_in_root_folder, list)
    print(f"SUCCESS: Get media in root folder (ID: {root_folder_id}) passed. Found {len(media_in_root_folder)} items.")
    # Expected in root: image.jpg, video.mp4, video_small.mp4 (3 items)
    assert len(media_in_root_folder) == 3, f"Expected 3 media items in root, found {len(media_in_root_folder)}"
    print("INFO: Correct number of media items (3) found in root folder.")

    subfolder_id_to_test = folders_cache.get(expected_subfolder_path)
    assert subfolder_id_to_test, "Subfolder ID not found in cache for testing media in subfolder"
    subfolder_id_encoded = urllib.parse.quote(subfolder_id_to_test)
    response_subfolder_media = client.get(f"/api/folders/{subfolder_id_encoded}/media")
    assert response_subfolder_media.status_code == 200
    media_in_subfolder = response_subfolder_media.json()
    assert isinstance(media_in_subfolder, list)
    print(f"SUCCESS: Get media in subfolder 'subfolder' (ID: {subfolder_id_to_test}) passed. Found {len(media_in_subfolder)} items.")
    # Expected in subfolder: image2.png (1 item)
    assert len(media_in_subfolder) == 1, f"Expected 1 item in subfolder, found {len(media_in_subfolder)}"
    assert media_in_subfolder[0]["path"] == "/subfolder/image2.png", "Media path mismatch in subfolder"
    print("INFO: Correct media item ('/subfolder/image2.png') found in subfolder.")

def test_adjacent_endpoints(media_id_for_nav):
    print("\n--- Testing Adjacent Endpoints ---")
    assert media_id_for_nav, "media_id_for_nav cannot be None for adjacent tests"
    media_id_encoded = urllib.parse.quote(media_id_for_nav)
    
    response_next = client.get(f"/api/adjacent?id={media_id_encoded}&dir=next&sort_by=created_at_desc")
    # This can be 200 or 404 if it's the last item
    assert response_next.status_code in [200, 404], f"Get next media failed: {response_next.text}"
    if response_next.status_code == 200:
        print(f"SUCCESS: Get next media for '{media_id_for_nav}' passed. Next ID: {response_next.json()['id']}")
    else:
        print(f"INFO: Get next media for '{media_id_for_nav}' returned 404 (possibly last item).")

    response_prev = client.get(f"/api/adjacent?id={media_id_encoded}&dir=prev&sort_by=created_at_desc")
    # This can be 200 or 404 if it's the first item
    assert response_prev.status_code in [200, 404], f"Get prev media failed: {response_prev.text}"
    if response_prev.status_code == 200:
        print(f"SUCCESS: Get previous media for '{media_id_for_nav}' passed. Previous ID: {response_prev.json()['id']}")
    else:
        print(f"INFO: Get previous media for '{media_id_for_nav}' returned 404 (possibly first item).")

def test_like_favorite_delete_endpoints(media_id_to_modify):
    print("\n--- Testing Like, Favorite, Delete Endpoints ---")
    assert media_id_to_modify, "media_id_to_modify cannot be None for like/fav/delete tests"
    media_id_encoded = urllib.parse.quote(media_id_to_modify)

    # Like
    response_like = client.post(f"/api/media/{media_id_encoded}/like", data={"liked": "true"}) # Form data
    assert response_like.status_code == 200, f"Like media failed: {response_like.text}"
    assert response_like.json().get("liked") is True
    print(f"SUCCESS: Like media item '{media_id_to_modify}' passed.")

    response_get_after_like = client.get(f"/api/media/{media_id_encoded}")
    assert response_get_after_like.status_code == 200
    assert response_get_after_like.json().get("liked") is True
    print(f"SUCCESS: Verified media item '{media_id_to_modify}' is liked.")

    # Favorite
    response_favorite = client.post(f"/api/media/{media_id_encoded}/favorite", data={"favorited": "true"}) # Form data
    assert response_favorite.status_code == 200, f"Favorite media failed: {response_favorite.text}"
    assert response_favorite.json().get("favorited") is True
    print(f"SUCCESS: Favorite media item '{media_id_to_modify}' passed.")

    response_get_after_favorite = client.get(f"/api/media/{media_id_encoded}")
    assert response_get_after_favorite.status_code == 200
    assert response_get_after_favorite.json().get("favorited") is True
    print(f"SUCCESS: Verified media item '{media_id_to_modify}' is favorited.")

    # Delete
    response_delete = client.delete(f"/api/media/{media_id_encoded}")
    assert response_delete.status_code == 200, f"Delete media failed: {response_delete.text}"
    assert response_delete.json().get("message") == "Media deleted successfully"
    print(f"SUCCESS: Delete media item '{media_id_to_modify}' passed.")
    
    response_get_after_delete = client.get(f"/api/media/{media_id_encoded}")
    assert response_get_after_delete.status_code == 404, "Media item not deleted (expected 404)"
    print(f"SUCCESS: Verified media item '{media_id_to_modify}' is deleted (got 404).")

if __name__ == "__main__":
    # Note: TestClient runs the app in-memory, so no need to "wait for server"
    # It also typically uses a separate test database if configured in the app,
    # or operates on the configured DB - ensure DB is clean or testable for this.
    # For these tests, we assume the DB is cleaned implicitly by re-scanning an empty root.
    
    num_total_tests = 0
    num_passed_tests = 0
    
    # A simple way to count tests: wrap test calls in a helper or count manually
    # For now, we'll just print and let assertions stop on failure

    setup_test_environment()
    
    try:
        test_health_check()
        test_config_endpoints() 
        test_scan_media()       

        print("\n--- Refreshing media cache for subsequent tests ---")
        response = client.get("/api/media?limit=20")
        if response.status_code == 200:
            media_items_cache = sorted(response.json(), key=lambda x: x['path']) 
            print(f"Refreshed media cache. Found {len(media_items_cache)} items.")
        else:
            print(f"CRITICAL: Error refreshing media cache. Status: {response.status_code}, Response: {response.text}")
            media_items_cache = [] 

        test_media_endpoints() 

        id_for_sub_tests = None
        if media_items_cache:
            found_item = next((item for item in media_items_cache if item["path"] == "/image.jpg"), None)
            if found_item: id_for_sub_tests = found_item["id"]
            elif media_items_cache: id_for_sub_tests = media_items_cache[0]["id"] 
        
        if id_for_sub_tests:
            print(f"\nINFO: Using media ID '{id_for_sub_tests}' for dependent tests.")
            test_tag_endpoints(id_for_sub_tests) 
            test_adjacent_endpoints(id_for_sub_tests) 
        else:
            print("\nWARNING: No suitable media ID found for tag/adjacent tests. Skipping.")

        test_search_endpoints() # Relies on media_items_cache[0] if available
        test_folder_endpoints() 

        id_for_destructive_tests = None
        # Try to pick a specific item for destructive tests, e.g., video_small.mp4
        item_for_destruction = next((item for item in media_items_cache if item["path"] == "/video_small.mp4"), None)
        if item_for_destruction: id_for_destructive_tests = item_for_destruction["id"]
        elif media_items_cache and len(media_items_cache) > 0: # Fallback
            if media_items_cache[-1]["id"] != id_for_sub_tests : id_for_destructive_tests = media_items_cache[-1]["id"]
            elif media_items_cache[0]["id"] != id_for_sub_tests or len(media_items_cache) == 1 : id_for_destructive_tests = media_items_cache[0]["id"]
        
        if id_for_destructive_tests:
            print(f"\nINFO: Using media ID '{id_for_destructive_tests}' for destructive tests.")
            test_like_favorite_delete_endpoints(id_for_destructive_tests)
        else:
            print("\nWARNING: No suitable media ID found for destructive tests. Skipping.")

        print("\n--- All Tests Attempted ---")
        # If script reaches here without an AssertionError, all explicit asserts passed.
        # Implicitly, if a test function completed, it means its direct assertions passed.
        # A more robust runner would count actual test functions and their pass/fail status.
        print("INFO: If no 'AssertionError' above, all explicit assertions in the tests passed.")

    except AssertionError as e:
        print(f"\n--- TEST FAILED ---")
        print(f"AssertionError: {e}")
    except Exception as e:
        print(f"\n--- AN UNEXPECTED ERROR OCCURRED ---")
        print(f"Exception: {e}")
    finally:
        cleanup_test_environment()
        print("\nScript finished.")
