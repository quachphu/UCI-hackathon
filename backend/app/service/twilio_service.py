from app.model.stt import AssemblyAIStreamerTwilio
from fastapi import WebSocketDisconnect
import os
import json
import base64
import asyncio
import dotenv

dotenv.load_dotenv()

async def stream_and_transcribe(ws):
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