from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from pydantic import BaseModel
from app.service.tts_service import synthesize_speech
from app.service.llm_service import get_response

tts_router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    language_code: str = "en-US"
    gender: str = "NEUTRAL"


@tts_router.post("/speak")
async def speak(req: TTSRequest):
    """
    Batch endpoint: send text, receive MP3 audio bytes.
    """
    audio_bytes = await synthesize_speech(
        text=req.text,
        language_code=req.language_code,
        gender=req.gender,
    )
    return Response(content=audio_bytes, media_type="audio/mpeg")


@tts_router.post("/ai-speak")
async def ai_speak(text: str, session_id: str = "1", language_code: str = "en-US"):
    """
    Send user text → get AI response → convert AI response to speech.
    Returns MP3 audio of the AI's reply.
    """
    ai_result = await get_response(text, session_id)
    audio_bytes = await synthesize_speech(
        text=ai_result["response"],
        language_code=language_code,
    )
    return Response(content=audio_bytes, media_type="audio/mpeg")


@tts_router.websocket("/stream")
async def stream_tts(websocket: WebSocket):
    """
    Real-time TTS via WebSocket.

    Connect: ws://localhost:4000/tts/stream

    Client sends JSON:
      {"text": "Hello world", "language_code": "en-US"}

    Server sends:
      - Binary MP3 audio bytes
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            text = data.get("text", "")
            language_code = data.get("language_code", "en-US")

            if not text:
                continue

            audio_bytes = await synthesize_speech(
                text=text,
                language_code=language_code,
            )
            await websocket.send_bytes(audio_bytes)

    except WebSocketDisconnect:
        pass
    finally:
        await websocket.close()
