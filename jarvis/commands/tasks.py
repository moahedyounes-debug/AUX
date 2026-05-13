"""
Tasks & Reminders - Alarms, timers, notes, calculations
"""

import datetime
import json
import logging
import os
import threading
import re
import math

logger = logging.getLogger("jarvis.tasks")


class TaskController:
    def __init__(self, config, speaker=None):
        self.config = config
        self.speaker = speaker  # Injected for reminders
        self._notes_file = os.path.expanduser("~/.jarvis/notes.json")
        self._tasks_file = os.path.expanduser("~/.jarvis/tasks.json")
        self._timers = []
        os.makedirs(os.path.expanduser("~/.jarvis"), exist_ok=True)

    def handle(self, intent: dict) -> str:
        action = intent.get("action", "").lower()
        target = intent.get("target", "").lower()
        params = intent.get("params", {})

        if any(w in action for w in ["ذكّرني", "تذكير", "remind", "تنبيه"]):
            return self.set_reminder(target, params)
        elif any(w in action for w in ["مؤقت", "timer", "عدّاد"]):
            return self.set_timer(target, params)
        elif any(w in action for w in ["ملاحظة", "note", "اكتب", "سجّل"]):
            return self.add_note(target, params)
        elif any(w in action for w in ["مهمة", "task", "أضف مهمة", "قائمة"]):
            return self.add_task(target, params)
        elif any(w in action for w in ["احسب", "calculate", "calculate", "حساب"]):
            return self.calculate(target, params)
        elif any(w in action for w in ["ملاحظاتي", "my notes", "اعرض الملاحظات"]):
            return self.list_notes()
        elif any(w in action for w in ["مهامي", "my tasks", "قائمة المهام"]):
            return self.list_tasks()
        else:
            return self.add_note(target, params)

    def set_reminder(self, target: str, params: dict) -> str:
        """Set a voice reminder after X minutes/hours."""
        minutes = self._extract_time_minutes(target)
        if minutes is None:
            minutes = int(params.get("minutes", 5))

        message = params.get("message", target) or f"تذكير بعد {minutes} دقيقة"

        def _remind():
            if self.speaker:
                self.speaker.speak(f"تذكير: {message}")
            else:
                print(f"\n🔔 تذكير: {message}")

        timer = threading.Timer(minutes * 60, _remind)
        timer.daemon = True
        timer.start()
        self._timers.append(timer)

        return f"سأذكّرك بعد {minutes} دقيقة: {message}"

    def set_timer(self, target: str, params: dict) -> str:
        """Set a countdown timer."""
        minutes = self._extract_time_minutes(target)
        if minutes is None:
            minutes = int(params.get("minutes", 1))

        def _ring():
            if self.speaker:
                self.speaker.speak(f"انتهى المؤقت! مرّت {minutes} دقيقة")
            else:
                print(f"\n⏰ انتهى المؤقت! مرّت {minutes} دقيقة")
            # Play a beep
            os.system("paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null")

        timer = threading.Timer(minutes * 60, _ring)
        timer.daemon = True
        timer.start()
        self._timers.append(timer)

        return f"تم ضبط المؤقت على {minutes} دقيقة"

    def add_note(self, content: str, params: dict) -> str:
        """Save a note."""
        if not content:
            return "ماذا تريد أن تسجّل؟"
        notes = self._load_json(self._notes_file, [])
        note = {
            "id": len(notes) + 1,
            "content": content,
            "created": datetime.datetime.now().isoformat(),
        }
        notes.append(note)
        self._save_json(self._notes_file, notes)
        return f"تم حفظ الملاحظة: {content}"

    def list_notes(self) -> str:
        notes = self._load_json(self._notes_file, [])
        if not notes:
            return "لا توجد ملاحظات محفوظة"
        recent = notes[-5:]
        lines = ["ملاحظاتك الأخيرة:"]
        for n in reversed(recent):
            lines.append(f"• {n['content']}")
        return "\n".join(lines)

    def add_task(self, content: str, params: dict) -> str:
        """Add a task to the task list."""
        if not content:
            return "ما المهمة التي تريد إضافتها؟"
        tasks = self._load_json(self._tasks_file, [])
        task = {
            "id": len(tasks) + 1,
            "content": content,
            "done": False,
            "created": datetime.datetime.now().isoformat(),
        }
        tasks.append(task)
        self._save_json(self._tasks_file, tasks)
        return f"تمت إضافة المهمة: {content}"

    def list_tasks(self) -> str:
        tasks = self._load_json(self._tasks_file, [])
        pending = [t for t in tasks if not t.get("done")]
        if not pending:
            return "لا توجد مهام معلّقة، أحسنت!"
        lines = [f"لديك {len(pending)} مهام:"]
        for t in pending:
            lines.append(f"☐ {t['content']}")
        return "\n".join(lines)

    def calculate(self, expression: str, params: dict) -> str:
        """Safe math calculation."""
        try:
            # Clean up the expression
            expr = expression.replace("×", "*").replace("÷", "/").replace("^", "**")
            # Arabic words to operators
            words = {
                "زائد": "+", "ناقص": "-", "مضروب في": "*",
                "مقسوم على": "/", "بالقوة": "**",
                "plus": "+", "minus": "-", "times": "*", "divided by": "/",
            }
            for word, op in words.items():
                expr = expr.replace(word, op)
            # Remove non-math characters (safe eval)
            expr = re.sub(r"[^0-9+\-*/().\s]", "", expr).strip()
            if not expr:
                return "لم أفهم المعادلة"
            result = eval(expr, {"__builtins__": {}}, {
                "abs": abs, "round": round,
                "sqrt": math.sqrt, "pi": math.pi,
            })
            return f"النتيجة: {result}"
        except ZeroDivisionError:
            return "لا يمكن القسمة على صفر"
        except Exception as e:
            logger.error(f"Calc error: {e}")
            return "لم أتمكن من حساب ذلك"

    def _extract_time_minutes(self, text: str) -> int | None:
        if not text:
            return None
        # Convert Arabic numerals
        ar_nums = {"٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
                   "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"}
        for ar, en in ar_nums.items():
            text = text.replace(ar, en)

        # Extract number + unit
        match = re.search(r"(\d+)\s*(دقيقة|دقائق|minute|min|ساعة|ساعات|hour|hr)", text)
        if match:
            num = int(match.group(1))
            unit = match.group(2)
            if any(u in unit for u in ["ساعة", "ساعات", "hour", "hr"]):
                return num * 60
            return num
        # Just a number - assume minutes
        match = re.search(r"(\d+)", text)
        if match:
            return int(match.group(1))
        return None

    def _load_json(self, path: str, default):
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return default

    def _save_json(self, path: str, data):
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Save JSON error: {e}")
