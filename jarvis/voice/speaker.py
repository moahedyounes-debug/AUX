"""
Voice Speaker - Text-to-Speech module
Supports: pyttsx3 (free/offline), gTTS (free/online)
"""

import logging
import threading
import queue
import os

logger = logging.getLogger("jarvis.speaker")


class VoiceSpeaker:
    def __init__(self, config):
        self.config = config
        self.engine_name = config.TTS_ENGINE
        self._engine = None
        self._speak_queue = queue.Queue()
        self._lock = threading.Lock()
        self._setup()
        self._start_worker()

    def _setup(self):
        if self.engine_name == "pyttsx3":
            self._setup_pyttsx3()
        # gTTS is initialized per-call (no persistent engine needed)

    def _setup_pyttsx3(self):
        try:
            import pyttsx3
            self._engine = pyttsx3.init()
            self._engine.setProperty("rate", self.config.TTS_RATE)
            self._engine.setProperty("volume", self.config.TTS_VOLUME)
            self._set_arabic_voice()
            logger.info("pyttsx3 TTS ready (offline mode)")
        except ImportError:
            logger.warning("pyttsx3 not installed. Falling back to gTTS.")
            self.engine_name = "gtts"
        except Exception as e:
            logger.warning(f"pyttsx3 init error: {e}. Falling back to gTTS.")
            self.engine_name = "gtts"

    def _set_arabic_voice(self):
        """Try to select an Arabic voice if available."""
        voices = self._engine.getProperty("voices")
        lang = self.config.TTS_VOICE_LANG.lower()
        for voice in voices:
            vid = voice.id.lower()
            vname = voice.name.lower()
            if lang in vid or lang in vname or "arabic" in vname or "arab" in vid:
                self._engine.setProperty("voice", voice.id)
                logger.info(f"Arabic voice selected: {voice.name}")
                return
        # Use first available voice if no Arabic found
        if voices:
            self._engine.setProperty("voice", voices[0].id)
            logger.info(f"Using voice: {voices[0].name}")

    def _start_worker(self):
        """Run TTS in a background thread to avoid blocking."""
        self._worker_thread = threading.Thread(target=self._worker, daemon=True)
        self._worker_thread.start()

    def _worker(self):
        while True:
            text = self._speak_queue.get()
            if text is None:
                break
            self._do_speak(text)
            self._speak_queue.task_done()

    def _do_speak(self, text: str):
        try:
            if self.engine_name == "pyttsx3":
                with self._lock:
                    self._engine.say(text)
                    self._engine.runAndWait()
            elif self.engine_name == "gtts":
                self._speak_gtts(text)
        except Exception as e:
            logger.error(f"TTS error: {e}")

    def _speak_gtts(self, text: str):
        try:
            from gtts import gTTS
            import tempfile
            lang = "ar" if self.config.TTS_VOICE_LANG == "ar" else "en"
            tts = gTTS(text=text, lang=lang, slow=False)
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                tmp_path = f.name
            tts.save(tmp_path)
            # Play the audio
            if os.name == "nt":
                os.system(f'start /min wmplayer "{tmp_path}"')
            else:
                # Try multiple players
                players = ["mpg123", "mpg321", "ffplay -nodisp -autoexit", "aplay"]
                for player in players:
                    if os.system(f"which {player.split()[0]} > /dev/null 2>&1") == 0:
                        os.system(f"{player} {tmp_path} > /dev/null 2>&1")
                        break
            os.unlink(tmp_path)
        except ImportError:
            logger.error("gTTS not installed. Run: pip install gtts")
        except Exception as e:
            logger.error(f"gTTS error: {e}")

    def speak(self, text: str, blocking: bool = False):
        """Queue text for speech output."""
        if not text:
            return
        print(f"\n[جارفيس]: {text}")
        self._speak_queue.put(text)
        if blocking:
            self._speak_queue.join()

    def speak_blocking(self, text: str):
        """Speak and wait until done."""
        self.speak(text, blocking=True)

    def stop(self):
        """Gracefully shut down the TTS worker."""
        self._speak_queue.put(None)
        self._worker_thread.join(timeout=3)
