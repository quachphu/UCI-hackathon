from fastapi import APIRouter, Request
from fastapi.responses import Response

twilio_router = APIRouter()

@twilio_router.post("/voice")
async def voice(request: Request):
    twiml = """
    <Response>
        <Say voice="alice">Hello This is your AI assistant I think Phu and Khoi is dum dum.</Say>
    </Response>
    """
    return Response(content=twiml, media_type="application/xml")