import re
from typing import Dict, List, Any
from enum import Enum


class IntentType(Enum):
    FILE_CREATE = "file_create"
    FILE_READ = "file_read"
    FILE_DELETE = "file_delete"
    SEND_EMAIL = "send_email"
    SCHEDULE_TASK = "schedule_task"
    OPEN_APP = "open_app"
    SYSTEM_INFO = "system_info"
    SMART_HOME_CONTROL = "smart_home_control"
    SCREENSHOT = "screenshot"
    MOUSE_CONTROL = "mouse_control"
    UNKNOWN = "unknown"


class CommandProcessor:
    def __init__(self):
        self.patterns = {
            IntentType.FILE_CREATE: [
                r'(افتح|انشئ|انشأ|اعمل).*ملف.*جديد',
                r'(افتح|انشئ|انشأ|اعمل).*\.(txt|doc|docx|xlsx|pdf)',
            ],
            IntentType.FILE_READ: [
                r'(اقرا|اعرض|افتح).*ملف',
                r'(ما محتوى|ايش في).*ملف',
            ],
            IntentType.FILE_DELETE: [
                r'(احذف|امسح|ارمي).*ملف',
            ],
            IntentType.SEND_EMAIL: [
                r'(ارسل|بعت|وديت).*ايميل',
                r'(ارسل|بعت|وديت).*رسالة.*',
            ],
            IntentType.SCHEDULE_TASK: [
                r'(جدول|اضبط|خطط).*موعد',
                r'(ذكرني|تذكير).*الساعة',
            ],
            IntentType.OPEN_APP: [
                r'(افتح|شغل|ابدا).*\b(chrome|firefox|notepad|word|excel|powerpoint|vlc|teams)\b',
                r'(افتح|شغل|ابدا).*تطبيق',
            ],
            IntentType.SMART_HOME_CONTROL: [
                r'(شغل|اطفي|خفف).*(\bضوء\b|انوار|لمبة)',
                r'(شغل|اطفي).*(\bتكييف\b|مكيف|مروحة)',
            ],
            IntentType.SCREENSHOT: [
                r'(خذ|اصور|التقط|سكرين).*شاشة',
            ],
            IntentType.SYSTEM_INFO: [
                r'(ايش|ما).*الوقت',
                r'(كم|ايش).*التاريخ',
                r'حالة.*النظام',
            ],
        }

    def parse(self, text: str, language: str = "ar") -> Dict[str, Any]:
        """Parse user command and extract intent and parameters"""
        text = text.strip().lower()

        intent = self._detect_intent(text)

        parameters = self._extract_parameters(text, intent)

        return {
            "original_text": text,
            "intent": intent.value,
            "parameters": parameters,
            "language": language
        }

    def _detect_intent(self, text: str) -> IntentType:
        """Detect command intent from text"""
        for intent, patterns in self.patterns.items():
            for pattern in patterns:
                if re.search(pattern, text):
                    return intent
        return IntentType.UNKNOWN

    def _extract_parameters(self, text: str, intent: IntentType) -> Dict[str, Any]:
        """Extract parameters from command based on intent"""
        params = {}

        if intent == IntentType.FILE_CREATE:
            filename_match = re.search(r'ملف\s+(\S+)', text)
            if filename_match:
                params['filename'] = filename_match.group(1)
            else:
                params['filename'] = 'file.txt'
            params['location'] = self._extract_location(text)

        elif intent == IntentType.FILE_READ:
            filename_match = re.search(r'ملف\s+(\S+)', text)
            if filename_match:
                params['filename'] = filename_match.group(1)

        elif intent == IntentType.SEND_EMAIL:
            email_match = re.search(r'([\w.-]+@[\w.-]+)', text)
            to_match = re.search(r'(الى|ل)\s+(\S+)', text)

            if email_match:
                params['recipient'] = email_match.group(1)
            elif to_match:
                params['recipient'] = to_match.group(2)

            params['subject'] = self._extract_subject(text)
            params['body'] = text

        elif intent == IntentType.SCHEDULE_TASK:
            time_match = re.search(r'(\d{1,2})\s*(:|:|\.\.)?\s*(\d{2})?', text)
            if time_match:
                hour = time_match.group(1)
                minute = time_match.group(3) or '00'
                params['time'] = f"{hour}:{minute}"

        elif intent == IntentType.OPEN_APP:
            apps = ['chrome', 'firefox', 'notepad', 'word', 'excel', 'vlc', 'teams']
            for app in apps:
                if app in text:
                    params['app'] = app
                    break

        elif intent == IntentType.SMART_HOME_CONTROL:
            action_match = re.search(r'(شغل|اطفي|خفف)', text)
            device_match = re.search(r'(ضوء|انوار|لمبة|تكييف|مكيف|مروحة)', text)

            if action_match:
                params['action'] = action_match.group(1)
            if device_match:
                params['device'] = device_match.group(1)

        return params

    def _extract_location(self, text: str) -> str:
        """Extract file location from command"""
        if 'سطح المكتب' in text or 'desktop' in text:
            return 'desktop'
        elif 'مستندات' in text or 'documents' in text:
            return 'documents'
        elif 'تنزيلات' in text or 'downloads' in text:
            return 'downloads'
        return 'documents'

    def _extract_subject(self, text: str) -> str:
        """Extract email subject from command"""
        subject_match = re.search(r'موضوع\s+(.+?)(?:و|،|$)', text)
        if subject_match:
            return subject_match.group(1)
        return "No Subject"

    def get_supported_commands(self) -> List[Dict[str, str]]:
        """Get list of supported commands"""
        return [
            {"intent": "file_create", "example": "افتح ملف جديد"},
            {"intent": "file_read", "example": "اقرأ ملف"},
            {"intent": "send_email", "example": "ارسل ايميل"},
            {"intent": "schedule_task", "example": "جدول موعد الساعة 3"},
            {"intent": "open_app", "example": "افتح chrome"},
            {"intent": "smart_home", "example": "شغل الضوء"},
            {"intent": "system_info", "example": "ايش الوقت"},
        ]
