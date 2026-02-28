from fastapi import APIRouter
from app.services.llm_service import get_response

llm_router = APIRouter()

llm_router("/get_response_from_llm")
async def get_response_from_llm(prompt):
    response = await get_response(prompt)

    return response

