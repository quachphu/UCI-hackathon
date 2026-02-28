from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.service.llm_service import get_response, get_chat_history, stream_response

llm_router = APIRouter()


# Request / Response models
class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    response: str
    session_id: str
 


# Routes
@llm_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a message and receive the AI counselor's reply."""
    result = await get_response(req.message, req.session_id)
    return result


@llm_router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """
    Returns chunks of the AI response one at a time via Server-Sent Events.
    The client receives words/tokens progressively instead of waiting for the full answer.
    """

    async def event_generator():
        async for chunk in stream_response(req.message, req.session_id):
            # SSE format: each message is "data: <content>\n\n"
            yield f"data: {chunk}\n\n"
        # Signal to the client that the stream is done
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@llm_router.get("/history/{session_id}")
async def history(session_id: str):
    """Retrieve the full conversation history for a session."""
    messages = await get_chat_history(session_id)
    return {"session_id": session_id, "messages": messages}
