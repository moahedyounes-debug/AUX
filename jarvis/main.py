#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════╗
║          JARVIS - مساعد جارفيس الذكي                    ║
║     نظام مساعد صوتي مجاني بالكامل                      ║
║  يعمل بدون إنترنت مع Ollama أو عبر Google STT            ║
╚══════════════════════════════════════════════════════════╝
"""

import sys
import os
import signal
import datetime
import logging
import threading
import argparse

# Add jarvis directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config as CONFIG
from utils.helpers import setup_logging, print_dependency_report, format_uptime, load_history, save_history
from voice.listener import VoiceListener
from voice.speaker import VoiceSpeaker
from ai.brain import AIBrain
from commands.computer import ComputerController
from commands.home import HomeController
from commands.web import WebController
from commands.tasks import TaskController

logger = logging.getLogger("jarvis.main")

BANNER = """
╔══════════════════════════════════════════════════════╗
║   🤖 JARVIS - المساعد الذكي                         ║
║   قل "جارفيس" أو "Jarvis" لتفعيلي                  ║
║   أو اكتب أمرك مباشرة في وضع النص                  ║
║   اكتب 'خروج' أو 'exit' للإنهاء                     ║
╚══════════════════════════════════════════════════════╝
"""

GREETINGS = [
    "مرحباً! أنا جارفيس، كيف أساعدك اليوم؟",
    "جارفيس جاهز للخدمة، ماذا تحتاج؟",
    "أهلاً! أنا هنا لمساعدتك.",
]


class Jarvis:
    def __init__(self, text_mode: bool = False):
        self.text_mode = text_mode
        self.running = False
        self.start_time = datetime.datetime.now()
        self._stop_event = threading.Event()

        print(BANNER)
        print("جاري تهيئة النظام...")

        setup_logging(CONFIG.LOG_FILE, CONFIG.DEBUG)
        self.history = load_history(CONFIG.HISTORY_FILE, CONFIG.MAX_HISTORY)

        # Initialize components
        self.speaker = VoiceSpeaker(CONFIG)

        if not text_mode:
            try:
                self.listener = VoiceListener(CONFIG)
            except Exception as e:
                logger.warning(f"Voice listener init failed: {e}. Switching to text mode.")
                self.text_mode = True
                self.listener = None
        else:
            self.listener = None

        self.brain = AIBrain(CONFIG)
        self.computer = ComputerController(CONFIG)
        self.home = HomeController(CONFIG)
        self.web = WebController(CONFIG)
        self.tasks = TaskController(CONFIG, speaker=self.speaker)

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

        print("النظام جاهز!\n")
        self.speaker.speak(GREETINGS[0])

    def _handle_signal(self, signum, frame):
        print("\nجارفيس: إلى اللقاء!")
        self.stop()

    def stop(self):
        self.running = False
        self._stop_event.set()
        save_history(CONFIG.HISTORY_FILE, self.history, CONFIG.MAX_HISTORY)
        self.speaker.stop()
        sys.exit(0)

    def process_command(self, text: str) -> str:
        """Main command processing pipeline."""
        if not text or not text.strip():
            return ""

        text = text.strip()
        logger.info(f"Processing command: '{text}'")

        # Save to history
        self.history.append({
            "role": "user",
            "content": text,
            "time": datetime.datetime.now().isoformat(),
        })

        # Built-in commands (no AI needed)
        builtin_response = self._check_builtin(text)
        if builtin_response:
            self._respond(builtin_response)
            return builtin_response

        # AI understanding
        try:
            intent = self.brain.understand(text)
        except Exception as e:
            logger.error(f"AI understanding error: {e}")
            intent = {
                "intent": "general",
                "action": "answer",
                "target": text,
                "params": {"query": text},
                "response": "حدث خطأ في المعالجة، يرجى المحاولة مجدداً",
            }

        intent_type = intent.get("intent", "general")
        logger.info(f"Intent: {intent_type} | Action: {intent.get('action')} | Target: {intent.get('target')}")

        # Route to appropriate handler
        try:
            if intent_type == "computer":
                result = self.computer.handle(intent)
            elif intent_type == "home":
                result = self.home.handle(intent)
            elif intent_type == "web":
                result = self.web.handle(intent)
            elif intent_type == "task":
                result = self.tasks.handle(intent)
            else:
                # General conversation
                result = intent.get("response") or self.brain.chat(text)
        except Exception as e:
            logger.error(f"Handler error: {e}")
            result = "عذراً، حدث خطأ أثناء التنفيذ"

        # Add AI response as supplementary info if different from handler result
        ai_response = intent.get("response", "")
        if ai_response and ai_response != result and intent_type != "general":
            self._respond(ai_response)

        self._respond(result)
        self.history.append({
            "role": "assistant",
            "content": result,
            "time": datetime.datetime.now().isoformat(),
        })
        return result

    def _check_builtin(self, text: str) -> str:
        """Fast pattern matching for common commands without AI."""
        t = text.lower()

        # Time & date
        if any(w in t for w in ["الوقت", "كم الساعة", "what time"]):
            return self.web.get_time()
        if any(w in t for w in ["التاريخ", "اليوم", "what day", "what date"]):
            return self.web.get_date()

        # Status commands
        if any(w in t for w in ["كيف حالك", "how are you", "ما أخبارك"]):
            uptime = format_uptime(self.start_time)
            return f"أنا بخير! أعمل منذ {uptime}. أنا جاهز لمساعدتك."
        if any(w in t for w in ["من أنت", "who are you", "عرّف نفسك"]):
            return "أنا جارفيس، مساعدك الذكي. أستطيع التحكم في الكمبيوتر، البيت الذكي، البحث، والمزيد!"
        if any(w in t for w in ["مساعدة", "help", "ماذا تستطيع"]):
            return self._help_text()

        # Screenshot shortcut
        if any(w in t for w in ["لقطة", "screenshot", "سكرين شوت"]):
            return self.computer.take_screenshot()

        # Quit
        if any(w in t for w in ["خروج", "وداعاً", "exit", "quit", "bye", "إلى اللقاء"]):
            self._respond("وداعاً! أتمنى لك يوماً سعيداً")
            self.stop()

        return ""

    def _respond(self, text: str):
        if text:
            self.speaker.speak(text)

    def _help_text(self) -> str:
        return (
            "أستطيع مساعدتك في:\n"
            "🖥️ الكمبيوتر: افتح متصفح، لقطة شاشة، اغلق تطبيق\n"
            "🏠 البيت: شغّل الضوء، أطفئ المروحة، تحكم في التكييف\n"
            "🌐 الإنترنت: ابحث عن، أخبار، طقس، يوتيوب\n"
            "📋 المهام: ذكّرني، مؤقت، ملاحظة\n"
            "🗣️ محادثة: أسئلة عامة، معلومات، حساب\n"
            "قل 'جارفيس' ثم أمرك!"
        )

    def run_voice_mode(self):
        """Main voice interaction loop."""
        self.running = True
        print("وضع الصوت نشط. قل 'جارفيس' للتفعيل...\n")

        while self.running:
            try:
                # Wait for wake word
                if self.listener.listen_for_wake_word():
                    self.speaker.speak("نعم، أنا معك")
                    print("[جارفيس] يستمع للأمر...")

                    # Listen for command
                    command = self.listener.listen()
                    if command:
                        print(f"[أنت]: {command}")
                        self.process_command(command)
                    else:
                        self.speaker.speak("لم أسمع أمراً واضحاً")
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"Voice loop error: {e}")

    def run_text_mode(self):
        """Interactive text mode fallback."""
        self.running = True
        print("وضع النص نشط. اكتب أمرك:\n")

        while self.running:
            try:
                text = input("أنت: ").strip()
                if text:
                    self.process_command(text)
            except (KeyboardInterrupt, EOFError):
                break

        self.stop()

    def run(self):
        if self.text_mode or not self.listener:
            self.run_text_mode()
        else:
            # Run voice in main thread, allow text input in background
            text_thread = threading.Thread(
                target=self._text_input_thread, daemon=True
            )
            text_thread.start()
            self.run_voice_mode()

    def _text_input_thread(self):
        """Allow text input even in voice mode."""
        while self.running:
            try:
                text = input()
                if text.strip():
                    self.process_command(text.strip())
            except (KeyboardInterrupt, EOFError):
                break


def parse_args():
    parser = argparse.ArgumentParser(
        description="JARVIS - مساعد صوتي ذكي مجاني",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--text", "-t",
        action="store_true",
        help="تشغيل في وضع النص فقط (بدون ميكروفون)",
    )
    parser.add_argument(
        "--web", "-w",
        action="store_true",
        help="تشغيل واجهة الويب (للجوال والمتصفح)",
    )
    parser.add_argument(
        "--telegram",
        action="store_true",
        help="تشغيل بوت تيليجرام",
    )
    parser.add_argument(
        "--ha-setup",
        action="store_true",
        help="دليل إعداد Home Assistant",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="فحص المكتبات المثبّتة",
    )
    parser.add_argument(
        "--engine",
        choices=["ollama", "claude", "openai"],
        default=None,
        help="محرك الذكاء الاصطناعي",
    )
    parser.add_argument(
        "--stt",
        choices=["google", "vosk", "whisper"],
        default=None,
        help="محرك التعرف على الصوت",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    if args.check:
        print_dependency_report()
        sys.exit(0)

    if args.ha_setup:
        from commands.home_assistant_setup import print_setup_guide
        print_setup_guide()
        sys.exit(0)

    if args.web:
        from web_interface.app import app
        import socket
        try:
            local_ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            local_ip = "127.0.0.1"
        print(f"\n🌐 واجهة الويب: http://localhost:{CONFIG.WEB_PORT}")
        print(f"📱 من الجوال:  http://{local_ip}:{CONFIG.WEB_PORT}\n")
        app.run(host=CONFIG.WEB_HOST, port=CONFIG.WEB_PORT, debug=CONFIG.WEB_DEBUG)
        sys.exit(0)

    if args.telegram:
        from telegram_bot.bot import run_bot
        run_bot()
        sys.exit(0)

    # Override config from CLI args
    if args.engine:
        CONFIG.AI_ENGINE = args.engine
    if args.stt:
        CONFIG.STT_ENGINE = args.stt

    jarvis = Jarvis(text_mode=args.text)
    jarvis.run()
