"""
Utility helpers - Logging, history, system info
"""

import json
import logging
import os
import platform
import sys
import datetime
from logging.handlers import RotatingFileHandler


def setup_logging(log_file: str, debug: bool = False) -> logging.Logger:
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    level = logging.DEBUG if debug else logging.INFO
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    root_logger = logging.getLogger("jarvis")
    root_logger.setLevel(level)

    # File handler with rotation
    fh = RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
    fh.setFormatter(formatter)
    root_logger.addHandler(fh)

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.WARNING)
    ch.setFormatter(formatter)
    root_logger.addHandler(ch)

    return root_logger


def get_system_info() -> dict:
    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "python": sys.version,
        "machine": platform.machine(),
        "hostname": platform.node(),
    }


def load_history(path: str, max_items: int = 20) -> list:
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                history = json.load(f)
            return history[-max_items:]
    except Exception:
        pass
    return []


def save_history(path: str, history: list, max_items: int = 20):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(history[-max_items:], f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.getLogger("jarvis").error(f"Save history error: {e}")


def format_uptime(start_time: datetime.datetime) -> str:
    delta = datetime.datetime.now() - start_time
    hours = int(delta.total_seconds() // 3600)
    minutes = int((delta.total_seconds() % 3600) // 60)
    return f"{hours} ساعة و{minutes} دقيقة"


def check_dependencies() -> dict:
    """Check which optional packages are installed."""
    packages = {
        "speech_recognition": "التعرف على الصوت (SpeechRecognition)",
        "pyttsx3": "تحويل النص لكلام (pyttsx3)",
        "gtts": "تحويل النص لكلام (gTTS)",
        "vosk": "التعرف على الصوت بدون إنترنت (Vosk)",
        "whisper": "التعرف على الصوت بدون إنترنت (Whisper)",
        "pyautogui": "التحكم في الفأرة والكيبورد (pyautogui)",
        "requests": "طلبات HTTP (requests)",
        "duckduckgo_search": "البحث في DuckDuckGo",
        "anthropic": "Claude AI API",
    }
    status = {}
    for pkg, desc in packages.items():
        try:
            __import__(pkg)
            status[pkg] = {"installed": True, "desc": desc}
        except ImportError:
            status[pkg] = {"installed": False, "desc": desc}
    return status


def print_dependency_report():
    status = check_dependencies()
    print("\n" + "="*50)
    print("فحص المكتبات المثبّتة:")
    print("="*50)
    for pkg, info in status.items():
        icon = "✓" if info["installed"] else "✗"
        print(f"  {icon} {info['desc']}")
    print("="*50 + "\n")
