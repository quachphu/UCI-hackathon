import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.llm import llm_router
from app.routes.twilio import twilio_router

app = FastAPI(title="988 Crisis Chatbot API")

# Allow the Next.js frontend (and any dev origin) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(llm_router, prefix="/llm", tags=["llm"])
app.include_router(twilio_router , prefix='/twilio',tags=["twilio"])

@app.get("/")
def root():
    return {"message": "988 Crisis Chatbot API is running"}
