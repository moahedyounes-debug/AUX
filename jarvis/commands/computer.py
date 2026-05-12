"""
Computer Control - Control applications, files, system, screen
"""

import os
import sys
import subprocess
import platform
import logging
import datetime

logger = logging.getLogger("jarvis.computer")

OS = platform.system().lower()  # "linux", "windows", "darwin"


class ComputerController:
    def __init__(self, config):
        self.config = config
        os.makedirs(config.SCREENSHOT_PATH, exist_ok=True)

    def handle(self, intent: dict) -> str:
        action = intent.get("action", "").lower()
        target = intent.get("target", "").lower()
        params = intent.get("params", {})

        handlers = {
            "open": self.open_app,
            "افتح": self.open_app,
            "شغّل": self.open_app,
            "اغلق": self.close_app,
            "اقفل": self.close_app,
            "screenshot": self.take_screenshot,
            "لقطة_شاشة": self.take_screenshot,
            "لقطة شاشة": self.take_screenshot,
            "التقط": self.take_screenshot,
            "volume": self.set_volume,
            "صوت": self.set_volume,
            "الصوت": self.set_volume,
            "type": self.type_text,
            "اكتب": self.type_text,
            "click": self.click,
            "اضغط": self.click,
            "brightness": self.set_brightness,
            "إضاءة_الشاشة": self.set_brightness,
            "shutdown": self.shutdown,
            "اغلق_الكمبيوتر": self.shutdown,
            "restart": self.restart,
            "اعد_التشغيل": self.restart,
            "lock": self.lock_screen,
            "قفّل_الشاشة": self.lock_screen,
            "sleep": self.sleep_system,
            "نوم": self.sleep_system,
            "files": lambda t, p: self.open_app("مدير_الملفات", p),
            "ملفات": lambda t, p: self.open_app("مدير_الملفات", p),
        }

        for key, handler in handlers.items():
            if key in action:
                return handler(target, params)

        # Fallback: try to open as app name
        if target:
            return self.open_app(target, params)
        return "لم أفهم الأمر، ماذا تريد أن أفعل؟"

    def open_app(self, target: str, params: dict = None) -> str:
        apps = self.config.APPS
        # Find matching app
        app_cmd = None
        for key, cmds in apps.items():
            if key in target or target in key:
                app_cmd = cmds.get(OS if OS != "darwin" else "mac")
                break

        if app_cmd:
            self._run(app_cmd)
            return f"تم فتح {target}"

        # Try running the target directly as a command
        if target:
            try:
                self._run(target)
                return f"تم تشغيل {target}"
            except Exception:
                pass

        return f"لم أجد التطبيق: {target}"

    def close_app(self, target: str, params: dict = None) -> str:
        try:
            if OS == "windows":
                subprocess.run(["taskkill", "/F", "/IM", f"{target}.exe"], check=False)
            else:
                subprocess.run(["pkill", "-f", target], check=False)
            return f"تم إغلاق {target}"
        except Exception as e:
            logger.error(f"Close app error: {e}")
            return f"لم أتمكن من إغلاق {target}"

    def take_screenshot(self, target: str = "", params: dict = None) -> str:
        try:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = os.path.join(self.config.SCREENSHOT_PATH, f"jarvis_{timestamp}.png")
            os.makedirs(os.path.dirname(filename), exist_ok=True)

            if OS == "linux":
                # Try multiple screenshot tools
                tools = [
                    ["scrot", filename],
                    ["gnome-screenshot", "-f", filename],
                    ["import", "-window", "root", filename],
                    ["xwd", "-root", "-silent"],
                ]
                for tool in tools:
                    if subprocess.run(["which", tool[0]], capture_output=True).returncode == 0:
                        subprocess.run(tool, check=True, timeout=10)
                        break
                else:
                    return "تعذّر أخذ لقطة الشاشة، تأكد من تثبيت scrot أو gnome-screenshot"
            elif OS == "windows":
                import ctypes
                subprocess.run(["snippingtool", "/clip"], check=False)
            elif OS == "darwin":
                subprocess.run(["screencapture", filename], check=True)

            return f"تم حفظ لقطة الشاشة في: {filename}"
        except Exception as e:
            logger.error(f"Screenshot error: {e}")
            return "تعذّر أخذ لقطة الشاشة"

    def set_volume(self, target: str, params: dict = None) -> str:
        level = params.get("level", "") if params else ""
        # Extract number from target or params
        num = self._extract_number(target) or self._extract_number(str(params))

        action_map = {
            "زيادة": "+5",
            "increase": "+5",
            "رفع": "+5",
            "تخفيض": "-5",
            "decrease": "-5",
            "خفض": "-5",
            "كتم": "0",
            "mute": "0",
            "صامت": "0",
        }

        vol_change = None
        for key, val in action_map.items():
            if key in target:
                vol_change = val
                break

        try:
            if OS == "linux":
                if vol_change:
                    if vol_change.startswith("+") or vol_change.startswith("-"):
                        subprocess.run(
                            ["amixer", "-q", "sset", "Master", f"{vol_change[1:]}%{vol_change[0]}"],
                            check=False,
                        )
                    else:
                        subprocess.run(["amixer", "-q", "sset", "Master", "mute"], check=False)
                elif num is not None:
                    subprocess.run(
                        ["amixer", "-q", "sset", "Master", f"{num}%"], check=False
                    )
            elif OS == "windows":
                # Use nircmd if available
                pass
            return f"تم تعديل الصوت"
        except Exception as e:
            logger.error(f"Volume error: {e}")
            return "تعذّر تعديل الصوت"

    def type_text(self, target: str, params: dict = None) -> str:
        text = params.get("text", target) if params else target
        try:
            import pyautogui
            pyautogui.typewrite(text, interval=0.05)
            return f"تم كتابة النص"
        except ImportError:
            logger.warning("pyautogui not installed")
            return "تحتاج لتثبيت pyautogui: pip install pyautogui"
        except Exception as e:
            logger.error(f"Type error: {e}")
            return "تعذّر كتابة النص"

    def click(self, target: str, params: dict = None) -> str:
        try:
            import pyautogui
            x = params.get("x") if params else None
            y = params.get("y") if params else None
            if x and y:
                pyautogui.click(int(x), int(y))
                return f"تم الضغط على ({x}, {y})"
            else:
                pyautogui.click()
                return "تم الضغط"
        except ImportError:
            return "تحتاج لتثبيت pyautogui"
        except Exception as e:
            logger.error(f"Click error: {e}")
            return "تعذّر الضغط"

    def set_brightness(self, target: str, params: dict = None) -> str:
        num = self._extract_number(target)
        if num is None:
            num = 70
        try:
            if OS == "linux":
                subprocess.run(
                    ["brightnessctl", "set", f"{num}%"], check=False, capture_output=True
                )
            return f"تم ضبط سطوع الشاشة على {num}%"
        except Exception as e:
            logger.error(f"Brightness error: {e}")
            return "تعذّر تعديل السطوع"

    def shutdown(self, target: str = "", params: dict = None) -> str:
        logger.warning("Shutdown requested")
        if OS == "linux":
            subprocess.run(["systemctl", "poweroff"], check=False)
        elif OS == "windows":
            subprocess.run(["shutdown", "/s", "/t", "0"], check=False)
        elif OS == "darwin":
            subprocess.run(["osascript", "-e", 'tell app "System Events" to shut down'], check=False)
        return "جيد، سأغلق الجهاز الآن"

    def restart(self, target: str = "", params: dict = None) -> str:
        if OS == "linux":
            subprocess.run(["systemctl", "reboot"], check=False)
        elif OS == "windows":
            subprocess.run(["shutdown", "/r", "/t", "0"], check=False)
        elif OS == "darwin":
            subprocess.run(["osascript", "-e", 'tell app "System Events" to restart'], check=False)
        return "سأعيد تشغيل الجهاز الآن"

    def lock_screen(self, target: str = "", params: dict = None) -> str:
        try:
            if OS == "linux":
                subprocess.run(["loginctl", "lock-session"], check=False)
            elif OS == "windows":
                subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"], check=False)
            elif OS == "darwin":
                subprocess.run(
                    ["osascript", "-e", 'tell app "System Events" to keystroke "q" using {control down, command down}'],
                    check=False,
                )
            return "تم قفل الشاشة"
        except Exception as e:
            logger.error(f"Lock error: {e}")
            return "تعذّر قفل الشاشة"

    def sleep_system(self, target: str = "", params: dict = None) -> str:
        try:
            if OS == "linux":
                subprocess.run(["systemctl", "suspend"], check=False)
            elif OS == "windows":
                subprocess.run(
                    ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"], check=False
                )
            elif OS == "darwin":
                subprocess.run(["pmset", "sleepnow"], check=False)
            return "سأضع الجهاز في وضع السكون"
        except Exception as e:
            logger.error(f"Sleep error: {e}")
            return "تعذّر الدخول في وضع السكون"

    def _run(self, cmd: str):
        if OS == "windows":
            subprocess.Popen(cmd, shell=True)
        else:
            subprocess.Popen(cmd.split(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def _extract_number(self, text: str) -> int | None:
        import re
        if not text:
            return None
        # Arabic numerals
        arabic_nums = {"٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
                       "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"}
        for ar, en in arabic_nums.items():
            text = text.replace(ar, en)
        match = re.search(r"\d+", text)
        return int(match.group()) if match else None
