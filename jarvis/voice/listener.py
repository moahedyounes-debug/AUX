"""
Voice Listener - Speech-to-Text module
Supports: Google STT (free/online), Vosk (free/offline), Whisper (free/offline)
"""

import time
import queue
import threading
import sys
import logging
from typing import Optional

logger = logging.getLogger("jarvis.listener")


class VoiceListener:
    def __init__(self, config):
        self.config = config
        self.engine = config.STT_ENGINE
        self.language = config.LANGUAGE
        self.wake_word = config.WAKE_WORD.lower()
        self.wake_word_en = config.WAKE_WORD_EN.lower()
        self._recognizer = None
        self._microphone = None
        self._vosk_model = None
        self._whisper_model = None
        self._setup()

    def _setup(self):
        """Initialize the STT engine."""
        try:
            import speech_recognition as sr
            self._recognizer = sr.Recognizer()
            self._recognizer.pause_threshold = 1.0
            self._recognizer.energy_threshold = 300
            self._recognizer.dynamic_energy_threshold = True
            self._microphone = sr.Microphone()

            with self._microphone as source:
                logger.info("Calibrating microphone for ambient noise...")
                self._recognizer.adjust_for_ambient_noise(source, duration=1)

            if self.engine == "vosk":
                self._setup_vosk()
            elif self.engine == "whisper":
                self._setup_whisper()

            logger.info(f"Voice listener ready (engine: {self.engine})")
        except ImportError:
            logger.error("speech_recognition not installed. Run: pip install SpeechRecognition")
            raise

    def _setup_vosk(self):
        try:
            from vosk import Model
            import os
            if not os.path.exists(self.config.VOSK_MODEL_PATH):
                logger.warning(
                    f"Vosk model not found at {self.config.VOSK_MODEL_PATH}. "
                    "Falling back to Google STT. Download Arabic model from: "
                    "https://alphacephei.com/vosk/models"
                )
                self.engine = "google"
                return
            self._vosk_model = Model(self.config.VOSK_MODEL_PATH)
            logger.info("Vosk model loaded (offline mode)")
        except ImportError:
            logger.warning("vosk not installed. Falling back to Google STT.")
            self.engine = "google"

    def _setup_whisper(self):
        try:
            import whisper
            logger.info(f"Loading Whisper model: {self.config.WHISPER_MODEL}")
            self._whisper_model = whisper.load_model(self.config.WHISPER_MODEL)
            logger.info("Whisper model loaded (offline mode)")
        except ImportError:
            logger.warning("whisper not installed. Falling back to Google STT.")
            self.engine = "google"

    def listen_for_wake_word(self) -> bool:
        """Block until wake word is detected. Returns True when detected."""
        import speech_recognition as sr
        print("\n[جارفيس] في انتظار كلمة التفعيل... قل 'جارفيس' أو 'Jarvis'")
        while True:
            try:
                with self._microphone as source:
                    audio = self._recognizer.listen(
                        source,
                        timeout=self.config.LISTEN_TIMEOUT,
                        phrase_time_limit=self.config.PHRASE_TIMEOUT,
                    )
                text = self._transcribe(audio).lower()
                if text and (self.wake_word in text or self.wake_word_en in text):
                    logger.info(f"Wake word detected in: '{text}'")
                    return True
            except sr.WaitTimeoutError:
                pass
            except Exception as e:
                logger.debug(f"Wake word listen error: {e}")

    def listen(self) -> Optional[str]:
        """Listen for a command after wake word. Returns transcribed text or None."""
        import speech_recognition as sr
        try:
            with self._microphone as source:
                audio = self._recognizer.listen(
                    source,
                    timeout=self.config.LISTEN_TIMEOUT,
                    phrase_time_limit=self.config.PHRASE_TIMEOUT,
                )
            text = self._transcribe(audio)
            if text:
                logger.info(f"Transcribed: '{text}'")
            return text
        except sr.WaitTimeoutError:
            logger.debug("Listen timeout")
            return None
        except Exception as e:
            logger.error(f"Listen error: {e}")
            return None

    def _transcribe(self, audio) -> str:
        """Transcribe audio using the configured engine."""
        import speech_recognition as sr
        try:
            if self.engine == "google":
                return self._transcribe_google(audio)
            elif self.engine == "vosk":
                return self._transcribe_vosk(audio)
            elif self.engine == "whisper":
                return self._transcribe_whisper(audio)
        except sr.UnknownValueError:
            return ""
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return ""

    def _transcribe_google(self, audio) -> str:
        import speech_recognition as sr
        try:
            return self._recognizer.recognize_google(audio, language=self.language)
        except sr.RequestError:
            # Try English fallback
            try:
                return self._recognizer.recognize_google(audio, language="en-US")
            except Exception:
                return ""

    def _transcribe_vosk(self, audio) -> str:
        import json
        from vosk import KaldiRecognizer
        wav_data = audio.get_wav_data(convert_rate=16000, convert_width=2)
        rec = KaldiRecognizer(self._vosk_model, 16000)
        rec.AcceptWaveform(wav_data)
        result = json.loads(rec.FinalResult())
        return result.get("text", "")

    def _transcribe_whisper(self, audio) -> str:
        import tempfile, os
        wav_data = audio.get_wav_data()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(wav_data)
            tmp_path = f.name
        try:
            result = self._whisper_model.transcribe(tmp_path, language="ar")
            return result.get("text", "").strip()
        finally:
            os.unlink(tmp_path)

    def listen_continuous(self, callback, stop_event: threading.Event):
        """Continuously listen in background and call callback with text."""
        import speech_recognition as sr

        def audio_callback(recognizer, audio):
            text = self._transcribe(audio)
            if text:
                callback(text)

        stop_listening = self._recognizer.listen_in_background(
            self._microphone, audio_callback
        )
        stop_event.wait()
        stop_listening(wait_for_stop=False)
