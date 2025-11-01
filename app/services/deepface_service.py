import os
import tempfile
import requests
from deepface import DeepFace

def analyze_video(video_path_or_url: str):
    """
    Analyze emotions in a video using DeepFace.
    Supports both local file paths and remote URLs.
    Returns: dictionary of emotion probabilities.
    """
    # Step 1: Determine if input is local file or URL
    if os.path.exists(video_path_or_url):
        video_path = video_path_or_url
    else:
        # Download remote video to temp file
        try:
            response = requests.get(video_path_or_url, stream=True, timeout=10)
            response.raise_for_status()  # raise error if bad status
        except requests.RequestException as e:
            raise RuntimeError(f"Failed to download video: {e}")

        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        for chunk in response.iter_content(chunk_size=8192):
            temp_file.write(chunk)
        temp_file.close()
        video_path = temp_file.name

    # Step 2: Run DeepFace analysis
    try:
        analysis_result = DeepFace.analyze(
            video_path,
            actions=["emotion"],
            enforce_detection=False  # skip frames with no face
        )
    except Exception as e:
        raise RuntimeError(f"DeepFace failed to analyze video: {e}")
    finally:
        # Cleanup temp file if used
        if not os.path.exists(video_path_or_url) and os.path.exists(video_path):
            os.remove(video_path)

    # Step 3: Extract emotion probabilities
    # DeepFace returns a list of dicts for video analysis, take average if needed
    if isinstance(analysis_result, list):
        emotions = {}
        for frame in analysis_result:
            for k, v in frame['emotion'].items():
                emotions[k] = emotions.get(k, 0) + v
        # Average across frames
        n_frames = len(analysis_result)
        emotions = {k: round(v / n_frames, 4) for k, v in emotions.items()}
    else:
        emotions = analysis_result.get("emotion", {})

    return emotions
