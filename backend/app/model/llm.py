from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

class Model:
    def __init__(self,template,history={},api_key=None):
        self.model = ChatOpenAI(
                    model="gpt-4o-mini",
                    temperature=0.3,
                    openai_api_key=api_key,
                    ) if api_key else ChatOllama(
                    model="llama3.2:3b",
                    temperature=0.3)
        
        self.prompt_template = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    template,
                ),
                MessagesPlaceholder(variable_name="history"),
                ("human", "{user_input}"),
                ]
            )
        self.chain = self.prompt_template | self.model
        self.history = history

    def get_session_history(self,session_id):
        # session_id = int(session_id)
        if session_id not in self.history:
            self.history[session_id] = ChatMessageHistory()
        return self.history[session_id]
    
    def _get_conversation(self):
        conversation = RunnableWithMessageHistory(
                self.chain,
                self.get_session_history,
                input_messages_key="user_input",
                history_messages_key="history"
            )
        return conversation
    
    async def converse_stream(self, session_id,user_input):
        conversation = self._get_conversation()
        async for chunk in conversation.astream({"user_input": user_input},config={'configurable':{"session_id":f"{session_id}"}}):
            yield chunk.content

    async def get_response(self, session_id,user_input):
        conversation = self._get_conversation()
        response = await conversation.ainvoke({"user_input": user_input},config={'configurable':{"session_id":f"{session_id}"}})
        return response.content
    
    async def get_summary(self, session_id: str) -> str:
        """Summarize the conversation for a given session."""
        history = self.get_session_history(session_id)
        if not history.messages:
            return "No conversation to summarize."

        conversation_text = "\n".join(
            f"{msg.type}: {msg.content}" for msg in history.messages
        )

        summary_prompt = f"""Summarize the following conversation concisely, 
        highlighting key concerns, emotions, and any action items:
        {conversation_text}
        Rank it with severity: [severe, moderate, normal]
        Type of incident: [Self-harm, suicidal, Depressed, Anxiety, Asking for resources]
        In the json format please"""

        response = await self.model.ainvoke([("human", summary_prompt)])
        return response.content