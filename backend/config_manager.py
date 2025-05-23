import json
import os

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

def save_media_path(path: str):
    """Saves the given media path to config.json."""
    with open(CONFIG_FILE, "w") as f:
        json.dump({"media_path": path}, f)

def load_media_path() -> str | None:
    """Loads the media path from config.json.

    Returns:
        The path if found, else None.
    """
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            try:
                data = json.load(f)
                return data.get("media_path")
            except json.JSONDecodeError:
                return None
    return None
