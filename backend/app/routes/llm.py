from fastapi import APIRouter
from pydantic import BaseModel
from app.service.llm_service import get_response, get_chat_history

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


@llm_router.get("/history/{session_id}")
async def history(session_id: str):
    """Retrieve the full conversation history for a session."""
    messages = await get_chat_history(session_id)
    return {"session_id": session_id, "messages": messages}



