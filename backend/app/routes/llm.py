from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.model.llm import Model
from app.dependencies.model import get_model
from app.service.llm_service import get_response, get_chat_history, stream_response

llm_router = APIRouter()

 
# Routes
@llm_router.post("/chat")
async def chat(user_input,session_id,model:Model=Depends(get_model)):
    """Send a message and receive the AI counselor's reply."""
    result = await get_response(user_input,session_id,model)
    return result


@llm_router.post("/stream")
async def chat_stream(user_input,session_id,model:Model=Depends(get_model)):
    """
    Returns chunks of the AI response one at a time via Server-Sent Events.
    The client receives words/tokens progressively instead of waiting for the full answer.
    """

    async def event_generator():
        async for chunk in stream_response(user_input,session_id,model):
            # SSE format: each message is "data: <content>\n\n"
            yield f"data: {chunk}\n\n"
        # Signal to the client that the stream is done
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@llm_router.get("/history/{session_id}")
async def history(session_id: str,model:Model=Depends(get_model)):
    """Retrieve the full conversation history for a session."""
    messages = await get_chat_history(session_id)
    return {"session_id": session_id, "messages": messages}
