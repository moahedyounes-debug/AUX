# 🔧 دليل التطوير - JARVIS AI

## بنية الكود

```
jarvis-ai/
├── backend/                 # Python FastAPI Server
│   ├── main.py             # Server الرئيسي
│   ├── command_processor.py # معالج الأوامر
│   ├── task_executor.py     # منفذ المهام
│   ├── integrations/        # التكاملات
│   │   ├── home_assistant.py
│   │   ├── email_handler.py
│   │   ├── file_manager.py
│   │   ├── computer_control.py
│   │   └── calendar_scheduler.py
│   ├── models/              # Models قاعدة البيانات
│   ├── requirements.txt
│   └── .env
│
├── web/                     # React Web App
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceInput.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── CommandHistory.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── index.tsx
│   ├── public/index.html
│   └── package.json
│
└── desktop/                 # Electron Desktop App
    ├── public/
    │   ├── main.js
    │   ├── preload.js
    │   └── index.html
    ├── src/
    │   ├── App.tsx
    │   └── index.tsx
    └── package.json
```

---

## إضافة أمر جديد

### 1. في `command_processor.py`

أضف intent جديد:

```python
class IntentType(Enum):
    YOUR_NEW_COMMAND = "your_new_command"
```

أضف pattern للتعرف على الأمر:

```python
self.patterns = {
    # ... existing patterns ...
    IntentType.YOUR_NEW_COMMAND: [
        r'(أول|ثاني|ثالث).*نص',
        r'كلمة.*أخرى',
    ]
}
```

أضف استخراج المعاملات:

```python
elif intent == IntentType.YOUR_NEW_COMMAND:
    param_match = re.search(r'قيمة\s+(\S+)', text)
    if param_match:
        params['value'] = param_match.group(1)
```

### 2. في `task_executor.py`

أضف دالة التنفيذ:

```python
async def _your_new_command(self, params: Dict) -> str:
    """تنفيذ الأمر الجديد"""
    value = params.get('value', 'default')
    
    try:
        # أكتب الكود الخاص بك هنا
        result = f"تم تنفيذ العملية: {value}"
        return result
    except Exception as e:
        return f"خطأ: {str(e)}"
```

أضف الـ routing في `execute`:

```python
async def execute(self, command: Dict[str, Any]) -> str:
    intent = command.get("intent")
    
    if intent == IntentType.YOUR_NEW_COMMAND.value:
        return await self._your_new_command(parameters)
```

### 3. مثال كامل: فتح موقع ويب

**command_processor.py:**
```python
class IntentType(Enum):
    OPEN_WEBSITE = "open_website"

self.patterns = {
    IntentType.OPEN_WEBSITE: [
        r'(افتح|ادخل|زور).*موقع',
        r'(افتح|ادخل).*\b(google|gmail|youtube)\b',
    ]
}

elif intent == IntentType.OPEN_WEBSITE:
    site_match = re.search(r'(google|gmail|youtube|github|stackoverflow)', text)
    if site_match:
        params['website'] = site_match.group(1)
```

**task_executor.py:**
```python
async def _open_website(self, params: Dict) -> str:
    """فتح موقع ويب"""
    website = params.get('website', 'google')
    
    urls = {
        'google': 'https://www.google.com',
        'gmail': 'https://mail.google.com',
        'youtube': 'https://www.youtube.com',
        'github': 'https://github.com',
        'stackoverflow': 'https://stackoverflow.com',
    }
    
    url = urls.get(website)
    if url:
        import webbrowser
        webbrowser.open(url)
        return f"✓ تم فتح {website}"
    return "الموقع غير معروف"
```

---

## إضافة تكامل جديد

### مثال: تكامل Telegram

**backend/integrations/telegram_bot.py:**
```python
import requests
from typing import Dict

class TelegramBot:
    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = chat_id
        self.api_url = f"https://api.telegram.org/bot{token}"
    
    async def send_message(self, text: str) -> bool:
        """إرسال رسالة عبر Telegram"""
        try:
            url = f"{self.api_url}/sendMessage"
            payload = {
                "chat_id": self.chat_id,
                "text": text
            }
            response = requests.post(url, json=payload)
            return response.status_code == 200
        except Exception as e:
            print(f"Error sending Telegram message: {e}")
            return False
```

في `main.py`:
```python
from integrations.telegram_bot import TelegramBot

telegram = TelegramBot(
    token=os.getenv('TELEGRAM_BOT_TOKEN'),
    chat_id=os.getenv('TELEGRAM_CHAT_ID')
)

# استخدمه في أي مكان
await telegram.send_message("رسالة من JARVIS")
```

---

## اختبار الأوامر

### 1. اختبار عبر API

```bash
# Windows PowerShell
$body = @{
    text = "افتح ملف جديد"
    language = "ar"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:8000/process-command `
  -Method Post `
  -ContentType application/json `
  -Body $body
```

### 2. اختبار الوحدة

```python
# في ملف test.py
from command_processor import CommandProcessor
from task_executor import TaskExecutor

processor = CommandProcessor()
executor = TaskExecutor()

# اختبر الأمر
command = processor.parse("افتح ملف جديد", "ar")
print("Parsed command:", command)

result = asyncio.run(executor.execute(command))
print("Result:", result)
```

### 3. اختبار العملية الكاملة

```bash
# 1. تأكد من تشغيل Backend
curl http://localhost:8000/health

# 2. فتح لسان Web App
# والتحدث أو اكتب الأمر

# 3. تحقق من سجلات Backend
```

---

## البيانات والقاعدة

### استخدام SQLite

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./jarvis.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# الحصول على جلسة
session = SessionLocal()
# استخدم الجلسة
session.close()
```

### إنشاء نماذج

```python
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class CommandLog(Base):
    __tablename__ = "command_logs"
    
    id = Column(Integer, primary_key=True)
    text = Column(String)
    intent = Column(String)
    result = Column(String)
    timestamp = Column(DateTime)
```

---

## الإنتاجية والأداء

### 1. استخدام الـ Caching

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_app_path(app_name: str) -> str:
    # البحث عن مسار التطبيق
    ...
```

### 2. المعالجة غير المتزامنة

```python
async def process_multiple_commands(commands):
    tasks = [executor.execute(cmd) for cmd in commands]
    results = await asyncio.gather(*tasks)
    return results
```

### 3. الـ Logging

```python
import logging

logger = logging.getLogger(__name__)

logger.info("Command processed successfully")
logger.error(f"Error: {str(e)}")
logger.debug(f"Debug info: {debug_data}")
```

---

## النشر والإنتاج

### نشر Backend على Heroku

```bash
# 1. إنشاء Procfile
echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile

# 2. إنشاء runtime.txt
echo "python-3.11.0" > runtime.txt

# 3. Deploy
heroku login
heroku create jarvis-ai-backend
git push heroku main
```

### نشر Frontend على Vercel

```bash
cd web
npm install -g vercel
vercel
```

### بناء Desktop App

```bash
cd desktop
npm run build
```

---

## المساهمة

1. Fork المشروع
2. إنشاء فرع جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للفرع (`git push origin feature/amazing-feature`)
5. افتح Pull Request

---

## الموارد والمراجع

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Electron Docs](https://www.electronjs.org/docs)
- [Home Assistant API](https://developers.home-assistant.io/)

---

استمتع بالتطوير! 🚀
