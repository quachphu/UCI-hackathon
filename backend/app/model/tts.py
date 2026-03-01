XI_API_KEY = os.environ["XI_API_KEY"]
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"          # Rachel
MODEL_ID = "eleven_multilingual_v2"        # Safe for WS

WS_URL = (
    f"wss://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/stream-input"
    f"?model_id={MODEL_ID}&output_format=pcm_16000&inactivity_timeout=180"
)

class Model:
    def __init__(self):
        pass