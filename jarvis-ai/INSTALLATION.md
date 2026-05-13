# 📦 دليل التثبيت الشامل - JARVIS AI

## المتطلبات النظامية

### Windows 10/11
- Python 3.11 أو أحدث
- Node.js 16+ و npm
- متصفح Chrome/Edge (للـ Web App)
- 2 GB RAM على الأقل

### macOS
- Python 3.11 أو أحدث
- Node.js 16+ و npm
- Safari أو Chrome
- 2 GB RAM على الأقل

### Linux
- Python 3.11 أو أحدث
- Node.js 16+ و npm
- Firefox أو Chrome
- 2 GB RAM على الأقل

---

## الخطوة 1: استنساخ أو تحميل المشروع

```bash
# طريقة 1: استنساخ من Git
git clone https://github.com/yourusername/jarvis-ai.git
cd jarvis-ai

# طريقة 2: تحميل الملفات مباشرة
# اسحب وأسقط الملفات أو استخدم wget/curl
```

---

## الخطوة 2: إعداد Backend (Python)

### 2.1 تثبيت Python

**Windows:**
```bash
# تحميل من https://www.python.org/downloads/
# ثم التحقق من التثبيت
python --version
```

**macOS/Linux:**
```bash
# باستخدام Homebrew (macOS)
brew install python3

# أو apt (Linux)
sudo apt install python3 python3-pip
```

### 2.2 إنشاء Virtual Environment

```bash
cd jarvis-ai/backend

# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 2.3 تثبيت المكتبات

```bash
pip install -r requirements.txt

# أو إذا كان هناك مشاكل
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.4 إنشاء ملف .env

```bash
# انسخ الملف المثال
cp .env.example .env

# أو على Windows
copy .env.example .env
```

ثم عدّل `.env`:
```ini
JARVIS_VERSION=1.0.0
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
LANGUAGE=ar
```

### 2.5 تشغيل Backend

```bash
python main.py
```

**النتيجة المتوقعة:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

افتح المتصفح على: `http://localhost:8000/docs`

---

## الخطوة 3: إعداد Web App (React)

### 3.1 تثبيت Node.js

**Windows/macOS:**
- حمّل من https://nodejs.org/
- اختر LTS version

**Linux:**
```bash
sudo apt install nodejs npm
```

### 3.2 التحقق من التثبيت

```bash
node --version
npm --version
```

### 3.3 تثبيت Dependencies

```bash
cd ../web
npm install

# إذا واجهت مشاكل
npm cache clean --force
npm install
```

### 3.4 تشغيل Web App

```bash
npm start
```

**النتيجة المتوقعة:**
```
Compiled successfully!

You can now view jarvis-web in the browser.
  Local:  http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

---

## الخطوة 4: إعداد Desktop App (Electron)

### 4.1 تثبيت Dependencies

```bash
cd ../desktop

npm install
```

### 4.2 تثبيت Electron (إذا لم يتم تثبيته)

```bash
npm install --save-dev electron
```

### 4.3 تشغيل التطبيق

**الطريقة 1: وضع التطوير**
```bash
npm run electron-dev
```

**الطريقة 2: البناء والتشغيل**
```bash
npm run build
npm start
```

---

## خطوات الإعداد الكامل (سريعة)

```bash
# 1. تنزيل المشروع
git clone https://github.com/yourusername/jarvis-ai.git
cd jarvis-ai

# 2. Backend - في Terminal 1
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python main.py

# 3. Web - في Terminal 2
cd web
npm install
npm start

# 4. Desktop - في Terminal 3 (اختياري)
cd desktop
npm install
npm start
```

---

## ✅ التحقق من التثبيت

### اختبر Backend
```bash
curl http://localhost:8000/health
# أو
curl http://localhost:8000/
```

### اختبر Web App
افتح المتصفح على: `http://localhost:3000`

### اختبر API
```bash
# Windows PowerShell:
$body = @{ text = "ايش الوقت"; language = "ar" } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:8000/process-command `
  -Method Post -ContentType application/json -Body $body

# macOS/Linux (curl):
curl -X POST http://localhost:8000/process-command \
  -H "Content-Type: application/json" \
  -d '{"text": "ايش الوقت", "language": "ar"}'
```

---

## 🐛 استكشاف المشاكل

### مشكلة: Port 8000 مستخدم
```bash
# اقتل العملية على Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# اقتل العملية على macOS/Linux
lsof -i :8000
kill -9 <PID>
```

### مشكلة: Python غير موجود
```bash
# Windows
python --version

# macOS/Linux
python3 --version
```

### مشكلة: npm لا يعمل
```bash
# تنظيف الـ cache
npm cache clean --force

# إعادة تثبيت
npm install
```

### مشكلة: لا يعمل التعرف على الصوت
- استخدم Chrome أو Edge
- تأكد من منح إذن الميكروفون
- جرب الإدخال النصي بدلاً من الصوتي

### مشكلة: الأوامر لا تنفذ
1. افتح Developer Console (F12)
2. انظر للأخطاء الحمراء
3. تحقق من سجلات Backend
4. جرب الأوامر البسيطة أولاً

---

## 🚀 الخطوات التالية

1. ✅ اقرأ [README.md](README.md)
2. ✅ اقرأ [QUICKSTART.md](QUICKSTART.md)
3. ✅ جرّب الأوامر الأساسية
4. ✅ أضف أوامر مخصصة
5. ✅ تكامل مع Home Assistant
6. ✅ تفعيل البريد الإلكتروني

---

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من سجل الأخطاء
2. اقرأ [README.md](README.md)
3. افتح Issue على GitHub
4. اطلب المساعدة في Discussions

---

**مبروك! لقد نجح التثبيت! 🎉**
