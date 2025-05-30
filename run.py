import uvicorn
import os
import sys

# Add the current directory to the path so we can import the backend package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
