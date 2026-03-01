import asyncio
import base64
import json
import logging

from app.service.stt_service import transcribe_stream_mulaw
from app.service.tts_service import synthesize_speech
from app.service.llm_service import stream_response

logger = logging.getLogger(__name__)

SENTENCE_ENDINGS = {".", "!", "?", "\n"}


async def stream_and_transcribe(ws, model):
    """
    Core Twilio stream handler.
    Receives audio → STT → LLM → TTS → sends audio back to caller.
    """
    audio_queue = asyncio.Queue()
    stream_sid = None

    async def _receive():
        nonlocal stream_sid
        try:
            while True:
                message = await ws.receive_text()
                data = json.loads(message)
                event = data.get("event")

                if event == "start":
                    stream_sid = data["start"]["streamSid"]
                    logger.info("Stream started: %s", stream_sid)

                elif event == "media":
                    audio_bytes = base64.b64decode(data["media"]["payload"])
                    await audio_queue.put(audio_bytes)

                elif event == "stop":
                    await audio_queue.put(None)
                    break
        except Exception as e:
            logger.error("Receive error: %s", e)
            await audio_queue.put(None)

    receive_task = asyncio.create_task(_receive())

    sentence_buffer = ""

    async for transcript, is_final in transcribe_stream_mulaw(audio_queue):
        logger.info("Transcript [final=%s]: %s", is_final, transcript)

        if is_final and transcript.strip():
            async for token in stream_response(transcript, session_id="twilio"):
                sentence_buffer += token

                if any(sentence_buffer.endswith(p) for p in SENTENCE_ENDINGS):
                    await _speak(ws, stream_sid, sentence_buffer.strip())
                    sentence_buffer = ""

            if sentence_buffer.strip():
                await _speak(ws, stream_sid, sentence_buffer.strip())
                sentence_buffer = ""

    receive_task.cancel()


async def _speak(ws, stream_sid: str, text: str):
    """Convert text to mulaw audio and send back to Twilio caller."""
    if not text.strip():
        return
    audio_bytes = await synthesize_speech(text, audio_encoding="MULAW")
    payload = base64.b64encode(audio_bytes).decode("utf-8")
    await ws.send_json(
        {"event": "media", "streamSid": stream_sid, "media": {"payload": payload}}
    )
    logger.info("Spoke to caller: %s", text)
