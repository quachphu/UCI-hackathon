from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

def get_response(prompt):
    llm = ChatOllama(
        model="llama3.2",          # or llama3.1:8b
        temperature=0.2,
        num_ctx=1000,
        base_url="http://localhost:11434",  # default Ollama URL
    )

    prompt = ChatPromptTemplate.from_messages([
        ('system','''You are a crisis counseling AI chatbot assistant for 988 hotline. 
        All of our counselors are busy assisting other. Be a companion, be empathetic. Chat like you
        are having a conversation rather than givin information. Be concise'''),
        # MessagesPlaceholder(variable_name="history"),
        ('human','{prompt}')
    ])

    chain = prompt | llm

    message = chain.invoke({'promtp':prompt})

    return {'response':message.content}