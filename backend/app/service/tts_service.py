import asyncio
import logging
from google.cloud import texttospeech
from dotenv import load_dotenv

load_dotenv()

client = texttospeech.TextToSpeechClient()
logger = logging.getLogger(__name__)


async def synthesize_speech(
    text: str,
    language_code: str = "en-US",
    gender: str = "NEUTRAL",
    audio_encoding: str = "MP3",  # "MP3" or "MULAW"
) -> bytes:
    """Convert text to speech. Use MULAW for Twilio, MP3 for browser."""

    if not text.strip():
        return b""

    synthesis_input = texttospeech.SynthesisInput(text=text)

    gender_map = {
        "NEUTRAL": texttospeech.SsmlVoiceGender.NEUTRAL,
        "MALE": texttospeech.SsmlVoiceGender.MALE,
        "FEMALE": texttospeech.SsmlVoiceGender.FEMALE,
    }

    voice = texttospeech.VoiceSelectionParams(
        language_code=language_code,
        ssml_gender=gender_map.get(
            gender.upper(), texttospeech.SsmlVoiceGender.NEUTRAL
        ),
    )

    # Twilio requires MULAW 8000Hz
    if audio_encoding == "MULAW":
        config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MULAW,
            sample_rate_hertz=8000,
        )
    else:
        config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=config,
        ),
    )

    logger.info("TTS synthesized %d chars [%s]", len(text), audio_encoding)
    return response.audio_content
