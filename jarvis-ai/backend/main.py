from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from datetime import datetime
import json

from command_processor import CommandProcessor
from task_executor import TaskExecutor

load_dotenv()

app = FastAPI(title="JARVIS AI Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

command_processor = CommandProcessor()
task_executor = TaskExecutor()


class CommandRequest(BaseModel):
    text: str
    language: str = "ar"


class CommandResponse(BaseModel):
    command: str
    intent: str
    parameters: dict
    status: str
    result: Optional[str] = None
    timestamp: str


@app.get("/")
async def root():
    return {
        "message": "مرحباً! أنا نظام جارفيس الذكي",
        "version": "1.0.0",
        "status": "active"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/process-command", response_model=CommandResponse)
async def process_command(request: CommandRequest):
    """معالجة الأوامر الصوتية والنصية"""
    try:
        parsed_command = command_processor.parse(request.text, request.language)

        result = await task_executor.execute(parsed_command)

        return CommandResponse(
            command=request.text,
            intent=parsed_command.get("intent", "unknown"),
            parameters=parsed_command.get("parameters", {}),
            status="success",
            result=result,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"خطأ في معالجة الأمر: {str(e)}"
        )


@app.websocket("/ws/voice")
async def websocket_voice_endpoint(websocket: WebSocket):
    """WebSocket للتحكم بالصوت في الوقت الفعلي"""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            command_data = json.loads(data)

            parsed = command_processor.parse(
                command_data.get("text", ""),
                command_data.get("language", "ar")
            )

            result = await task_executor.execute(parsed)

            await websocket.send_json({
                "intent": parsed.get("intent"),
                "result": result,
                "timestamp": datetime.now().isoformat()
            })
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()


@app.get("/commands/list")
async def list_commands():
    """الحصول على قائمة الأوامر المدعومة"""
    return {
        "commands": command_processor.get_supported_commands()
    }


@app.get("/status")
async def get_status():
    """الحصول على حالة النظام"""
    return {
        "jarvis": {
            "version": "1.0.0",
            "status": "online",
            "features": {
                "voice_recognition": True,
                "file_operations": True,
                "email_integration": False,
                "smart_home": False,
                "scheduling": False
            }
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True
    )
