# 🚀 البدء السريع - JARVIS AI

## الخطوة 1️⃣: تشغيل Backend

```bash
cd jarvis-ai/backend
pip install -r requirements.txt
python main.py
```

**النتيجة المتوقعة:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## الخطوة 2️⃣: تشغيل Web App

**في نافذة terminal جديدة:**

```bash
cd jarvis-ai/web
npm install
npm start
```

**النتيجة المتوقعة:**
```
Compiled successfully!

You can now view jarvis-web in the browser.
  Local:  http://localhost:3000
```

## الخطوة 3️⃣: استخدام جارفيس

1. افتح المتصفح على: `http://localhost:3000`
2. اضغط الزر الأزرق الكبير 🎤
3. تحدث بالعربية أو الإنجليزية
4. شاهد النتائج فوراً

## 📝 أوامر الاختبار

جرب هذه الأوامر:

| الأمر | النتيجة |
|------|--------|
| "افتح ملف جديد" | ✓ إنشاء file.txt |
| "افتح Chrome" | ✓ تشغيل المتصفح |
| "ايش الوقت" | ✓ عرض الوقت الحالي |
| "التقط صورة" | ✓ حفظ screenshot |

## 🔌 اختبار API مباشرة

```bash
# على Windows PowerShell:
$body = @{
    text = "افتح ملف جديد"
    language = "ar"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/process-command" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

## 🛠️ استكشاف المشاكل

### المتصفح يقول "لا يمكن الاتصال"
- تأكد من تشغيل Backend على `http://localhost:8000`
- جرب في المتصفح: `http://localhost:8000/health`

### لا يعمل الميكروفون
- استخدم Chrome أو Edge
- وافق على إذن الميكروفون
- جرب الإدخال النصي بدلاً من الصوتي

### الأمر ينفذ لكن بدون نتيجة
- افتح Developer Console (F12)
- انظر للأخطاء الحمراء
- تحقق من سجلات Backend

## 📱 التطبيق على سطح المكتب

```bash
cd jarvis-ai/desktop
npm install
npm start
```

## ☁️ نشر على الإنترنت

للنشر على السحابة:

### Backend (Python):
- [Heroku](https://www.heroku.com)
- [Railway](https://railway.app)
- [AWS Lightsail](https://lightsail.aws.amazon.com)

### Frontend (React):
- [Netlify](https://netlify.com)
- [Vercel](https://vercel.com)
- [GitHub Pages](https://pages.github.com)

## 🎯 الخطوات التالية

1. ✅ تشغيل Backend و Frontend
2. 📖 اقرأ [README.md](README.md) للتفاصيل
3. 🔧 استكشف الأوامر المدعومة
4. 🚀 أضف أوامر مخصصة
5. 🏠 متابعة Home Assistant
6. 📧 تفعيل البريد الإلكتروني

---

**هل تحتاج إلى مساعدة؟** 
اقرأ [README.md](README.md) أو افتح Issue على GitHub
