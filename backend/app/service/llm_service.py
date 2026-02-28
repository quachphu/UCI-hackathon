import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

load_dotenv()

# ── In-memory session store (keyed by session_id) ──────────────────────
# Each caller / chat window gets its own history, just like ChatGPT threads.
_session_store: dict[str, ChatMessageHistory] = {}


def _get_session_history(session_id: str) -> ChatMessageHistory:
    """Return (or create) the message history for a given session."""
    if session_id not in _session_store:
        _session_store[session_id] = ChatMessageHistory()
    return _session_store[session_id]


# Build the chain once at module level 
_llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.3,
    openai_api_key=os.getenv("OPENAI_API_KEY"),
)

_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a crisis counseling AI chatbot assistant for 988 hotline. "
            "All of our counselors are busy assisting other. Be a companion, be empathetic. "
            "Chat like you are having a conversation rather than giving information. Be concise.",
        ),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{user_input}"),
    ]
)

_chain = _prompt | _llm
# Wrap with per-session message history so the bot remembers the conversation
_chain_with_history = RunnableWithMessageHistory(
    _chain,
    _get_session_history,
    input_messages_key="user_input",
    history_messages_key="history",
)


# Public API 
async def get_response(user_input: str, session_id: str = "default") -> dict:
    """
    Send a user message and get the AI counselor's reply.
    Conversation history is maintained per session_id.
    """
    result = await _chain_with_history.ainvoke(
        {"user_input": user_input},
        config={"configurable": {"session_id": session_id}},
    )
    return {"response": result.content, "session_id": session_id}


async def get_chat_history(session_id: str) -> list[dict]:
    """Return the full conversation history for a session."""
    history = _get_session_history(session_id)
    return [{"role": msg.type, "content": msg.content} for msg in history.messages]


