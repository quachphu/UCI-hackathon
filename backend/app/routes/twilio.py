from fastapi import APIRouter, Request, WebSocket
from fastapi.responses import Response
from app.service.twilio_service import stream_and_transcribe



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
    stream_and_transcribe(ws)
    