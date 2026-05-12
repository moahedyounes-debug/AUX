"""
AI Brain - Command understanding and response generation
Supports: Ollama (free/local), Claude API (optional), OpenAI (optional)
"""

import json
import logging
import os
from typing import Optional

logger = logging.getLogger("jarvis.brain")

SYSTEM_PROMPT = """أنت جارفيس، مساعد ذكاء اصطناعي متقدم يعمل بالصوت.
أنت تفهم الأوامر العربية والإنجليزية وتستجيب دائماً بشكل موجز وواضح.

قدراتك:
- التحكم في الكمبيوتر (فتح تطبيقات، إدارة ملفات، لقطات الشاشة)
- التحكم في البيت الذكي (إضاءة، مروحة، تكييف، ستائر)
- البحث على الإنترنت
- إدارة المهام والتذكيرات
- الإجابة على الأسئلة العامة
- قراءة الأخبار والطقس

عند فهم الأمر، قم بتحديد:
1. نوع الأمر (computer/home/web/task/general)
2. التفاصيل المطلوبة للتنفيذ
3. رد مختصر وودي للمستخدم

استجب دائماً بالعربية ما لم يتحدث المستخدم بالإنجليزية.
كن مختصراً في ردودك - لا تزيد عن جملتين."""

INTENT_PROMPT = """حلل هذا الأمر الصوتي وحدد النية منه بتنسيق JSON فقط:

الأمر: "{command}"

أعد JSON بهذا التنسيق الدقيق:
{{
  "intent": "computer|home|web|task|general|unknown",
  "action": "الفعل المطلوب",
  "target": "الهدف/الجهاز/التطبيق",
  "params": {{}},
  "response": "رد قصير للمستخدم"
}}

أمثلة للـ intent:
- computer: افتح متصفح، التقط لقطة شاشة، افتح الملفات
- home: شغّل الضوء، أطفئ المروحة، تحكم في التكييف
- web: ابحث عن، ما أخبار، كم الطقس
- task: ذكّرني، ضع تنبيه، أضف مهمة
- general: كيف حالك، كم الساعة، ما هو...

لا تضف أي نص خارج JSON."""


class AIBrain:
    def __init__(self, config):
        self.config = config
        self.engine = config.AI_ENGINE
        self.history = []
        self._setup()

    def _setup(self):
        if self.engine == "ollama":
            self._check_ollama()
        elif self.engine == "claude":
            self._setup_claude()
        elif self.engine == "openai":
            self._setup_openai()
        logger.info(f"AI brain ready (engine: {self.engine})")

    def _check_ollama(self):
        try:
            import requests
            r = requests.get(f"{self.config.OLLAMA_HOST}/api/tags", timeout=3)
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                logger.info(f"Ollama models available: {models}")
                if not any(self.config.OLLAMA_MODEL.split(":")[0] in m for m in models):
                    logger.warning(
                        f"Model '{self.config.OLLAMA_MODEL}' not found. "
                        f"Run: ollama pull {self.config.OLLAMA_MODEL}"
                    )
        except Exception:
            logger.warning(
                "Ollama not running. Start it with: ollama serve\n"
                "Or download from: https://ollama.ai"
            )

    def _setup_claude(self):
        if not self.config.CLAUDE_API_KEY:
            logger.warning("ANTHROPIC_API_KEY not set. Falling back to Ollama.")
            self.engine = "ollama"

    def _setup_openai(self):
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            logger.warning("OPENAI_API_KEY not set. Falling back to Ollama.")
            self.engine = "ollama"

    def understand(self, command: str) -> dict:
        """Parse a voice command into structured intent."""
        prompt = INTENT_PROMPT.format(command=command)
        raw = self._generate(prompt, system=SYSTEM_PROMPT, json_mode=True)
        return self._parse_intent(raw, command)

    def _parse_intent(self, raw: str, original: str) -> dict:
        raw = raw.strip()
        # Extract JSON if wrapped in markdown code blocks
        if "```" in raw:
            lines = raw.split("\n")
            json_lines = []
            in_block = False
            for line in lines:
                if line.startswith("```"):
                    in_block = not in_block
                elif in_block:
                    json_lines.append(line)
            raw = "\n".join(json_lines)
        try:
            data = json.loads(raw)
            data.setdefault("intent", "general")
            data.setdefault("action", "")
            data.setdefault("target", "")
            data.setdefault("params", {})
            data.setdefault("response", "حسناً، سأقوم بذلك.")
            return data
        except json.JSONDecodeError:
            logger.warning(f"Could not parse intent JSON: {raw[:200]}")
            return {
                "intent": "general",
                "action": "answer",
                "target": "",
                "params": {"query": original},
                "response": raw if raw else "لم أفهم الأمر، يمكنك إعادة المحاولة؟",
            }

    def chat(self, message: str) -> str:
        """General conversation response."""
        self.history.append({"role": "user", "content": message})
        if len(self.history) > self.config.MAX_HISTORY * 2:
            self.history = self.history[-self.config.MAX_HISTORY * 2:]
        response = self._generate(message, system=SYSTEM_PROMPT)
        self.history.append({"role": "assistant", "content": response})
        return response

    def _generate(self, prompt: str, system: str = "", json_mode: bool = False) -> str:
        try:
            if self.engine == "ollama":
                return self._generate_ollama(prompt, system, json_mode)
            elif self.engine == "claude":
                return self._generate_claude(prompt, system)
            elif self.engine == "openai":
                return self._generate_openai(prompt, system)
        except Exception as e:
            logger.error(f"Generation error ({self.engine}): {e}")
            # Try fallback
            if self.engine != "ollama":
                logger.info("Falling back to Ollama...")
                try:
                    return self._generate_ollama(prompt, system, json_mode)
                except Exception:
                    pass
        return ""

    def _generate_ollama(self, prompt: str, system: str, json_mode: bool = False) -> str:
        import requests
        payload = {
            "model": self.config.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.3, "num_predict": 512},
        }
        if system:
            payload["system"] = system
        if json_mode:
            payload["format"] = "json"

        r = requests.post(
            f"{self.config.OLLAMA_HOST}/api/generate",
            json=payload,
            timeout=self.config.AI_TIMEOUT,
        )
        r.raise_for_status()
        return r.json().get("response", "")

    def _generate_claude(self, prompt: str, system: str) -> str:
        import anthropic
        client = anthropic.Anthropic(api_key=self.config.CLAUDE_API_KEY)
        messages = self.history[-6:] if self.history else []
        messages.append({"role": "user", "content": prompt})
        response = client.messages.create(
            model=self.config.CLAUDE_MODEL,
            max_tokens=512,
            system=system,
            messages=messages,
        )
        return response.content[0].text

    def _generate_openai(self, prompt: str, system: str) -> str:
        from openai import OpenAI
        client = OpenAI()
        messages = [{"role": "system", "content": system}]
        messages.extend(self.history[-6:])
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=512,
            temperature=0.3,
        )
        return response.choices[0].message.content
