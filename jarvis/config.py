"""
JARVIS Configuration
Edit these settings to match your setup.
"""

import os

# ─── AI Engine ──────────────────────────────────────────────────────────────
# Options: "ollama" (free, local) | "claude" (needs API key) | "openai"
AI_ENGINE = "ollama"

# Ollama settings (download from https://ollama.ai - completely free)
OLLAMA_HOST = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2"          # or "mistral", "phi3", "gemma2"

# Claude API (optional fallback)
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-haiku-4-5-20251001"

# ─── Voice Settings ──────────────────────────────────────────────────────────
# STT: "vosk" (offline/free) | "google" (needs internet, free) | "whisper" (offline/free)
STT_ENGINE = "google"
WAKE_WORD = "جارفيس"                # The wake word to activate listening
WAKE_WORD_EN = "jarvis"
LANGUAGE = "ar-SA"                 # Arabic (Saudi) - change to "en-US" for English

# Vosk model path (download from https://alphacephei.com/vosk/models)
VOSK_MODEL_PATH = os.path.expanduser("~/vosk-model-ar")

# Whisper model size: "tiny", "base", "small", "medium", "large"
WHISPER_MODEL = "base"

# TTS settings
TTS_ENGINE = "pyttsx3"             # "pyttsx3" (offline) | "gtts" (online)
TTS_RATE = 170                     # Words per minute
TTS_VOLUME = 0.9                   # 0.0 to 1.0
TTS_VOICE_LANG = "ar"              # "ar" for Arabic, "en" for English

# ─── Home Automation ─────────────────────────────────────────────────────────
# Home Assistant settings (https://www.home-assistant.io - free)
HOME_ASSISTANT_URL = "http://localhost:8123"
HOME_ASSISTANT_TOKEN = os.getenv("HA_TOKEN", "")

# Smart devices mapping (customize for your home)
DEVICES = {
    "غرفة_النوم": {
        "ضوء": "light.bedroom_light",
        "مروحة": "switch.bedroom_fan",
        "تكييف": "climate.bedroom_ac",
    },
    "الصالة": {
        "ضوء": "light.living_room_light",
        "تلفزيون": "media_player.living_room_tv",
        "ستائر": "cover.living_room_curtains",
    },
    "المطبخ": {
        "ضوء": "light.kitchen_light",
    },
    "الحمام": {
        "ضوء": "light.bathroom_light",
    },
    "الخارج": {
        "ضوء": "light.outdoor_light",
        "بوابة": "cover.gate",
    },
}

# ─── Computer Control ─────────────────────────────────────────────────────────
# Applications mapping (command : display name)
APPS = {
    "متصفح": {"linux": "xdg-open https://google.com", "win": "start chrome", "mac": "open -a 'Google Chrome'"},
    "chrome": {"linux": "google-chrome", "win": "start chrome", "mac": "open -a 'Google Chrome'"},
    "firefox": {"linux": "firefox", "win": "start firefox", "mac": "open -a Firefox"},
    "vscode": {"linux": "code", "win": "code", "mac": "code"},
    "محرر_الأكواد": {"linux": "code", "win": "code", "mac": "code"},
    "terminal": {"linux": "x-terminal-emulator", "win": "cmd", "mac": "open -a Terminal"},
    "محطة_الطرفية": {"linux": "x-terminal-emulator", "win": "cmd", "mac": "open -a Terminal"},
    "مدير_الملفات": {"linux": "nautilus", "win": "explorer", "mac": "open ."},
    "حاسبة": {"linux": "gnome-calculator", "win": "calc", "mac": "open -a Calculator"},
    "spotify": {"linux": "spotify", "win": "start spotify", "mac": "open -a Spotify"},
    "discord": {"linux": "discord", "win": "start discord", "mac": "open -a Discord"},
    "telegram": {"linux": "telegram-desktop", "win": "start telegram", "mac": "open -a Telegram"},
}

# Screenshot save path
SCREENSHOT_PATH = os.path.expanduser("~/Pictures/jarvis_screenshots/")

# ─── General Settings ─────────────────────────────────────────────────────────
DEBUG = False
LOG_FILE = os.path.expanduser("~/.jarvis/jarvis.log")
HISTORY_FILE = os.path.expanduser("~/.jarvis/history.json")
MAX_HISTORY = 20                   # Conversation memory size

# Response language: "ar" | "en" | "auto"
RESPONSE_LANG = "ar"

# Timeout settings (seconds)
LISTEN_TIMEOUT = 10
PHRASE_TIMEOUT = 5
AI_TIMEOUT = 30
