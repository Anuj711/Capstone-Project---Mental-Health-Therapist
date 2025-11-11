import os
import cv2
import tempfile
import requests
from deepface import DeepFace

def download_remote_video(video_url: str) -> str:
    """
    Downloads a remote video URL to a temporary file and returns the file path.
    Supports Google Drive direct links.
    """
    try:
        response = requests.get(video_url, stream=True, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        raise RuntimeError(f"Failed to download video: {e}")

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    for chunk in response.iter_content(chunk_size=8192):
        temp_file.write(chunk)
    temp_file.close()
    return temp_file.name

def analyze_video(video_url: str):
    """
    Analyze emotions in a video using DeepFace.
    Supports both local file paths and remote URLs.
    Returns: dictionary of emotion probabilities.
    """
    # Step 1: Determine if input is local file or URL
    temp_file_path = None
    if os.path.exists(video_url):
        video_path = video_url
    else:
        # Download remote video (Google Drive / public URL)
        video_path = download_remote_video(video_url)
        temp_file_path = video_path  # mark for cleanup

    # Step 2: Extract emotions using DeepFace (frame-based)
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video file: {video_path}")

        frame_results = []
        frame_count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
            if frame_count % 30 == 0:  # analyze every 30th frame
                try:
                    result = DeepFace.analyze(
                        frame, actions=["emotion"], enforce_detection=False
                    )
                    frame_results.append(result)
                except Exception as e:
                    print(f"Frame {frame_count} DeepFace warning: {e}")
                    continue
        cap.release()
    except Exception as e:
        raise RuntimeError(f"DeepFace failed to analyze video: {e}")
    finally:
        # Cleanup temp file if used
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    # Step 3: Aggregate emotions across frames
    # TODO: Will optimize code after
    emotions = {}
    if frame_results:
        for frame in frame_results:
            if isinstance(frame, list):
                for face in frame:
                    for k, v in face['emotion'].items():
                        emotions[k] = emotions.get(k, 0) + v
            elif isinstance(frame, dict):
                for k, v in frame.get('emotion', {}).items():
                    emotions[k] = emotions.get(k, 0) + v

        total_frames = sum(len(f) if isinstance(f, list) else 1 for f in frame_results)
        emotions = {k: round(v / total_frames, 4) for k, v in emotions.items()}
    else:
        emotions = {}


    return emotions
