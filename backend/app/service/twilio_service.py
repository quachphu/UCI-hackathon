from app.model.stt import AssemblyAIStreamerTwilio
from fastapi import WebSocketDisconnect
import os
import json
import base64
import asyncio
import dotenv

dotenv.load_dotenv()

async def stream_and_transcribe(ws,model):
    await ws.accept()


    # Run start() in a thread — it calls connect() which blocks    
    try:
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)

            event = data.get("event")
            if event == "start":
                stream_id = data['start']['streamSid']
                print(f"[Twilio] start: streamSid={stream_id}")

                aai_streamer = AssemblyAIStreamerTwilio(api_key=os.getenv("ASSEMBLYAI_API_KEY", ""),
                                            model=model,
                                            loop = asyncio.get_event_loop(),
                                            ws=ws,
                                            stream_sid=stream_id)
                aai_streamer.start()

            elif event == "media":
                if aai_streamer:
                    audio_bytes = base64.b64decode(data["media"]["payload"])
                    aai_streamer.send_audio(audio_bytes)

            elif event == "stop":
                print("[Twilio] stop received")
                if aai_streamer:
                    aai_streamer.stop()
                break

    except WebSocketDisconnect:
        print("[Twilio] Disconnected")
        if aai_streamer:
            aai_streamer.stop()
    except Exception as e:
        print(f"[Twilio] Error: {e}")
        if aai_streamer:
            aai_streamer.stop()