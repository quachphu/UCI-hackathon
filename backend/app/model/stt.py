import asyncio
from fastapi import (
    APIRouter,
    Response,
    UploadFile,
    File,
    Form,
    WebSocket,
    WebSocketDisconnect,
)
from app.service.stt_service import transcribe_audio, transcribe_stream
from app.service.llm_service import get_response, stream_response

stt_router = APIRouter()


@stt_router.post("/voice-chat")
async def voice_chat(
    audio: UploadFile = File(...), session_id: str = Form(default="1")
):
    """
    Batch endpoint: upload a complete audio file, get transcript + AI response.
    """
    audio_bytes = await audio.read()
    transcript, stt_time = await transcribe_audio(audio_bytes)
    ai_result = await get_response(transcript, session_id)

    return {
        "transcript": transcript,
        "ai_response": ai_result["response"],
        "session_id": session_id,
        "transcription_time_seconds": stt_time,
    }


@stt_router.websocket("/stream")
async def stream_voice(websocket: WebSocket):
    """
    Real-time streaming STT via WebSocket.

    Connect: ws://localhost:4000/stt/stream?session_id=1

    Client sends:
      - Raw PCM audio bytes (mono, 16-bit, 16000 Hz) as binary frames
      - A text frame "END" to signal end of speech

    Server sends JSON messages:
      {"type": "transcript", "text": "...", "is_final": false}  ← live caption
      {"type": "transcript", "text": "...", "is_final": true}   ← confirmed sentence
      {"type": "ai_token",   "text": "..."}                     ← LLM token (streaming)
      {"type": "ai_done"}                                        ← LLM turn finished

    Key: LLM reply starts streaming immediately after each confirmed sentence,
    NOT after the entire speech ends — this cuts perceived latency dramatically.
    """
    await websocket.accept()
    session_id = websocket.query_params.get("session_id", "1")

    audio_queue: asyncio.Queue = asyncio.Queue()

    async def _receive_audio():
        try:
            while True:
                message = await websocket.receive()
                if "bytes" in message:
                    await audio_queue.put(message["bytes"])
                elif message.get("text") == "END":
                    await audio_queue.put(None)
                    break
        except WebSocketDisconnect:
            await audio_queue.put(None)

    receive_task = asyncio.create_task(_receive_audio())

    async for text, is_final in transcribe_stream(audio_queue):
        await websocket.send_json(
            {"type": "transcript", "text": text, "is_final": is_final}
        )

        # ← KEY CHANGE: respond after each final sentence, stream tokens immediately
        if is_final:
            async for token in stream_response(text, session_id):
                await websocket.send_json({"type": "ai_token", "text": token})
            await websocket.send_json({"type": "ai_done"})

    receive_task.cancel()
    await websocket.close()
