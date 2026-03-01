import os
import json
import base64
import asyncio
import dotenv
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response

from app.model.stt import AssemblyAIStreamerTwilio

dotenv.load_dotenv()

twilio_router = APIRouter()

@twilio_router.post("/call")
async def twilio_voice(request: Request):
    stream_url = "wss://conchiferous-nola-pervertible.ngrok-free.dev/twilio/stream"

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
        <Say>Connecting you now.</Say>
        <Connect>
            <Stream url="{stream_url}" />
        </Connect>
        </Response>"""
    return Response(content=twiml, media_type="text/xml")

@twilio_router.websocket("/stream")
async def twilio_stream(ws: WebSocket):
    await ws.accept()

    aai_streamer = AssemblyAIStreamerTwilio(api_key=os.getenv("ASSEMBLYAI_API_KEY", ""))

    # Run start() in a thread — it calls connect() which blocks
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, aai_streamer.start)

    try:
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)

            event = data.get("event")
            if event == "start":
                start = data.get("start", {})
                print(f"[Twilio] start: streamSid={start.get('streamSid')}")

            elif event == "media":
                media = data.get("media", {})
                payload_b64 = media.get("payload")
                if payload_b64:
                    audio_bytes = base64.b64decode(payload_b64)
                    aai_streamer.send_audio(audio_bytes)

            elif event == "stop":
                print("[Twilio] stop received")
                break

    except WebSocketDisconnect:
        print("[Twilio] WebSocket disconnected")
    except Exception as e:
        print("[Server] Error:", e)
    finally:
        aai_streamer.stop()
        try:
            await ws.close()
        except Exception:
            pass