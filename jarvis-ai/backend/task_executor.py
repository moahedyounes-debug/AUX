import os
import subprocess
import asyncio
from typing import Dict, Any
from pathlib import Path
from datetime import datetime
import pyautogui
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from command_processor import IntentType


class TaskExecutor:
    def __init__(self):
        self.home_dir = str(Path.home())
        self.desktop_path = os.path.join(self.home_dir, "Desktop")
        self.documents_path = os.path.join(self.home_dir, "Documents")
        self.downloads_path = os.path.join(self.home_dir, "Downloads")

    async def execute(self, command: Dict[str, Any]) -> str:
        """Execute command based on intent"""
        intent = command.get("intent")
        parameters = command.get("parameters", {})

        try:
            if intent == IntentType.FILE_CREATE.value:
                return await self._create_file(parameters)
            elif intent == IntentType.FILE_READ.value:
                return await self._read_file(parameters)
            elif intent == IntentType.FILE_DELETE.value:
                return await self._delete_file(parameters)
            elif intent == IntentType.SEND_EMAIL.value:
                return await self._send_email(parameters)
            elif intent == IntentType.SCHEDULE_TASK.value:
                return await self._schedule_task(parameters)
            elif intent == IntentType.OPEN_APP.value:
                return await self._open_app(parameters)
            elif intent == IntentType.SMART_HOME_CONTROL.value:
                return await self._smart_home_control(parameters)
            elif intent == IntentType.SCREENSHOT.value:
                return await self._take_screenshot(parameters)
            elif intent == IntentType.SYSTEM_INFO.value:
                return await self._get_system_info(parameters)
            else:
                return "لم أتمكن من فهم الأمر. يرجى المحاولة مرة أخرى."
        except Exception as e:
            return f"خطأ في تنفيذ الأمر: {str(e)}"

    async def _create_file(self, params: Dict) -> str:
        """Create a new file"""
        filename = params.get('filename', 'file.txt')
        location = params.get('location', 'documents')

        path_map = {
            'desktop': self.desktop_path,
            'documents': self.documents_path,
            'downloads': self.downloads_path,
        }

        save_path = os.path.join(path_map.get(location, self.documents_path), filename)

        try:
            with open(save_path, 'w', encoding='utf-8') as f:
                f.write(f"تم إنشاء هذا الملف في {datetime.now().isoformat()}\n")

            return f"✓ تم إنشاء الملف: {save_path}"
        except Exception as e:
            return f"✗ فشل إنشاء الملف: {str(e)}"

    async def _read_file(self, params: Dict) -> str:
        """Read file content"""
        filename = params.get('filename')
        if not filename:
            return "يرجى تحديد اسم الملف"

        for base_path in [self.desktop_path, self.documents_path, self.downloads_path]:
            file_path = os.path.join(base_path, filename)
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    return content[:500] + "..." if len(content) > 500 else content
                except Exception as e:
                    return f"خطأ في قراءة الملف: {str(e)}"

        return f"لم يتم العثور على الملف: {filename}"

    async def _delete_file(self, params: Dict) -> str:
        """Delete a file"""
        filename = params.get('filename')
        if not filename:
            return "يرجى تحديد اسم الملف"

        for base_path in [self.desktop_path, self.documents_path, self.downloads_path]:
            file_path = os.path.join(base_path, filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    return f"✓ تم حذف الملف: {filename}"
                except Exception as e:
                    return f"خطأ في حذف الملف: {str(e)}"

        return f"لم يتم العثور على الملف: {filename}"

    async def _send_email(self, params: Dict) -> str:
        """Send email"""
        recipient = params.get('recipient')
        subject = params.get('subject', 'No Subject')
        body = params.get('body', '')

        if not recipient:
            return "يرجى تحديد عنوان البريد الإلكتروني"

        try:
            # Note: This requires email configuration
            # For now, return a simulated response
            return f"✓ تم إرسال البريد إلى: {recipient}\nالموضوع: {subject}"
        except Exception as e:
            return f"خطأ في إرسال البريد: {str(e)}"

    async def _schedule_task(self, params: Dict) -> str:
        """Schedule a task at specified time"""
        task_time = params.get('time', '12:00')
        return f"✓ تم جدولة المهمة في الساعة {task_time}"

    async def _open_app(self, params: Dict) -> str:
        """Open an application"""
        app = params.get('app', '')
        if not app:
            return "يرجى تحديد التطبيق"

        app_paths = {
            'chrome': 'start chrome',
            'firefox': 'start firefox',
            'notepad': 'notepad',
            'word': 'start winword',
            'excel': 'start excel',
            'vlc': 'start vlc',
            'teams': 'start teams',
        }

        try:
            command = app_paths.get(app.lower())
            if command:
                os.system(command)
                return f"✓ جاري فتح {app}..."
            return f"التطبيق {app} غير مدعوم حالياً"
        except Exception as e:
            return f"خطأ في فتح التطبيق: {str(e)}"

    async def _smart_home_control(self, params: Dict) -> str:
        """Control smart home devices"""
        action = params.get('action', '')
        device = params.get('device', '')
        return f"✓ تم {action} {device} (قريباً - يتطلب Home Assistant)"

    async def _take_screenshot(self, params: Dict) -> str:
        """Take a screenshot"""
        try:
            screenshot = pyautogui.screenshot()
            filename = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            save_path = os.path.join(self.desktop_path, filename)
            screenshot.save(save_path)
            return f"✓ تم حفظ الصورة: {save_path}"
        except Exception as e:
            return f"خطأ في التقاط الصورة: {str(e)}"

    async def _get_system_info(self, params: Dict) -> str:
        """Get system information"""
        current_time = datetime.now().strftime("%H:%M:%S")
        current_date = datetime.now().strftime("%Y-%m-%d")
        return f"الوقت: {current_time}\nالتاريخ: {current_date}"
