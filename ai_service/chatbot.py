from fastapi import FastAPI, HTTPException
from openai import OpenAI
from pydantic import BaseModel

app = FastAPI()
client = OpenAI()

class ChatRequest(BaseModel):
    message: str
    language: str = "en"  # "en" for English, "hi" for Hindi

@app.post("/chat")
async def chat_response(request: ChatRequest):
    try:
        # Create system prompt for disaster management context
        system_prompt = """You are a disaster management expert providing advice on:
        1. Emergency preparedness
        2. Disaster response
        3. Safety protocols
        4. Local emergency resources"""
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            temperature=0.7
        )
        
        return {
            "response": response.choices[0].message.content,
            "language": request.language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))