from app.model.llm import Model
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

load_dotenv()

SYSTEM = '''You are a crisis counseling AI chatbot assistant for 988 hotline. 
            All of our counselors are busy assisting other. Be a companion, be empathetic. 
            Chat like you are having a conversation rather than giving information. Be concise.'''

_model = Model(template = SYSTEM,)


# Public API 
async def get_response(user_input: str, session_id: str = "default") -> dict:
    """
    Send a user message and get the AI counselor's reply.
    Conversation history is maintained per session_id.
    """
    response = await _model.get_response(user_input=user_input,session_id=session_id)

    return {"response": response, "session_id": session_id}

async def stream_response(user_input: str, session_id: str = "default"):
    """
    Async generator — yields one text chunk at a time from the LLM.
    Each chunk is a small string (a word or partial word) as it's produced.
    """
    async for chunk in _model.converse_stream(
        session_id=session_id, user_input=user_input
    ):
        if chunk:
            yield chunk

async def get_chat_history(session_id: str) -> list[dict]:
    """Return the full conversation history for a session."""
    history = _model.get_session_history(session_id)
    return [{"role": msg.type, "content": msg.content} for msg in history.messages]