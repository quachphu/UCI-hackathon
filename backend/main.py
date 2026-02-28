from fastapi import FastAPI
from app.routes.test import test_router
from app.routes.llm import llm_router


app = FastAPI()
app.include_router(test_router, prefix="/api", tags=["api"])
app.include_router(llm_router, prefix="/llm", tags=["llm"])


@app.get("/")
def root():
    return {"message": "Hello World"}
