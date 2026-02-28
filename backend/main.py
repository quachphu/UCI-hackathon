import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.test import test_router
from app.routes.llm import llm_router


app = FastAPI()

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test_router, prefix="/api", tags=["api"])
app.include_router(llm_router, prefix="/llm", tags=["llm"])


@app.get("/")
def root():
    return {"message": "Hello World"}
