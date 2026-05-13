"""
Web Interface for JARVIS
Access from any device on your network: http://<your-ip>:5000
Uses browser's built-in Web Speech API - no extra libraries needed
"""

import sys
import os
import json
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS

import config as CONFIG
from ai.brain import AIBrain
from commands.computer import ComputerController
from commands.home import HomeController
from commands.web import WebController
from commands.tasks import TaskController
from utils.helpers import load_history, save_history

app = Flask(__name__)
CORS(app)

# Initialize JARVIS components
brain = AIBrain(CONFIG)
computer = ComputerController(CONFIG)
home = HomeController(CONFIG)
web_ctrl = WebController(CONFIG)
tasks = TaskController(CONFIG)
history = load_history(CONFIG.HISTORY_FILE, CONFIG.MAX_HISTORY)


def process_command(text: str) -> str:
    """Same pipeline as main.py but returns string result."""
    if not text.strip():
        return ""

    # Save to history
    history.append({"role": "user", "content": text, "time": datetime.datetime.now().isoformat()})

    # Built-in fast commands
    t = text.lower()
    if any(w in t for w in ["الوقت", "كم الساعة"]):
        result = web_ctrl.get_time()
    elif any(w in t for w in ["التاريخ", "اليوم"]):
        result = web_ctrl.get_date()
    elif any(w in t for w in ["كيف حالك", "من أنت"]):
        result = "أنا جارفيس، مساعدك الذكي! كيف أساعدك؟"
    elif any(w in t for w in ["مساعدة", "help"]):
        result = ("أستطيع مساعدتك في:\n"
                  "🖥️ الكمبيوتر: افتح متصفح، لقطة شاشة\n"
                  "🏠 البيت: شغّل الضوء، أطفئ المروحة\n"
                  "🌐 الإنترنت: ابحث عن، طقس، أخبار\n"
                  "📋 المهام: ذكّرني، مؤقت، ملاحظة")
    else:
        intent = brain.understand(text)
        intent_type = intent.get("intent", "general")
        try:
            if intent_type == "computer":
                result = computer.handle(intent)
            elif intent_type == "home":
                result = home.handle(intent)
            elif intent_type == "web":
                result = web_ctrl.handle(intent)
            elif intent_type == "task":
                result = tasks.handle(intent)
            else:
                result = intent.get("response") or brain.chat(text)
        except Exception as e:
            result = f"حدث خطأ: {str(e)}"

    history.append({"role": "assistant", "content": result, "time": datetime.datetime.now().isoformat()})
    save_history(CONFIG.HISTORY_FILE, history, CONFIG.MAX_HISTORY)
    return result


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/command", methods=["POST"])
def command():
    data = request.get_json()
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "لا يوجد نص"}), 400
    result = process_command(text)
    return jsonify({"response": result, "input": text})


@app.route("/api/history")
def get_history():
    return jsonify(history[-20:])


@app.route("/api/devices")
def get_devices():
    return jsonify(CONFIG.DEVICES)


@app.route("/api/home/toggle", methods=["POST"])
def toggle_device():
    data = request.get_json()
    room = data.get("room", "")
    device = data.get("device", "")
    state = data.get("state", True)
    action = "شغّل" if state else "أطفئ"
    intent = {
        "intent": "home",
        "action": action,
        "target": f"{device} {room}",
        "params": {},
    }
    result = home.handle(intent)
    return jsonify({"response": result})


if __name__ == "__main__":
    import socket
    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = "127.0.0.1"

    print(f"""
╔═══════════════════════════════════════════════╗
║   🌐 واجهة JARVIS الويب جاهزة                ║
║                                               ║
║   من الكمبيوتر: http://localhost:5000         ║
║   من الجوال:   http://{local_ip}:5000         ║
╚═══════════════════════════════════════════════╝
""")
    app.run(host="0.0.0.0", port=5000, debug=False)
