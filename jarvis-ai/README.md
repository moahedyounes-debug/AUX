# 🤖 JARVIS AI Assistant - نظام جارفيس الذكي

نظام مساعد ذكي متكامل يعمل بالأوامر الصوتية ويتحكم في جهازك والبيت الذكي. **مجاني بالكامل وتطبيق مفتوح المصدر**.

## ✨ الميزات الرئيسية

### 🎤 التحكم الصوتي
- اعترف الصوت العربي والإنجليزي
- واجهة ويب وتطبيق سطح مكتب
- تحكم فوري بدون تأخير

### 📁 إدارة الملفات
- ✓ إنشاء ملفات جديدة
- ✓ قراءة محتويات الملفات
- ✓ حذف الملفات
- ✓ على سطح المكتب أو المستندات

### 🚀 تشغيل التطبيقات
- فتح أي برنامج على جهازك
- التحكم بسهولة: "افتح Chrome"
- دعم البرامج الشهيرة

### 📸 التقاط الصور
- التقط صورة من الشاشة بأمر واحد
- حفظ فوري على سطح المكتب

### 📧 البريد الإلكتروني (قريباً)
- إرسال رسائل عبر الصوت
- إرسال المرفقات
- قوالب مجهزة

### ⏰ جدولة المهام (قريباً)
- ضبط تذكيرات بالوقت
- جدولة الأحداث
- إشعارات تلقائية

### 🏠 التحكم بالمنزل الذكي (قريباً)
- التكامل مع Home Assistant
- التحكم بالأضواء والأجهزة
- سيناريوهات تلقائية

## 🛠️ التثبيت والإعداد

### المتطلبات
- Python 3.11+
- Node.js 16+
- متصفح حديث يدعم Web Speech API

### 1. تثبيت Backend

```bash
cd jarvis-ai/backend
pip install -r requirements.txt
python main.py
```

الخادم سيعمل على: `http://localhost:8000`

### 2. تثبيت Web Frontend

```bash
cd jarvis-ai/web
npm install
npm start
```

الواجهة ستفتح على: `http://localhost:3000`

### 3. تشغيل تطبيق سطح المكتب (اختياري)

```bash
cd jarvis-ai/desktop
npm install
npm start
```

## 📚 أمثلة على الأوامر

### ✍️ إنشاء ملفات
- "افتح ملف جديد على سطح المكتب"
- "انشئ ملف باسم notes.txt"

### 📖 قراءة الملفات
- "اقرأ ملف notes.txt"
- "ما محتوى الملف؟"

### 🚀 تشغيل التطبيقات
- "افتح Chrome"
- "شغل Notepad"
- "ابدأ Teams"

### ⚙️ معلومات النظام
- "ايش الوقت الآن"
- "كم التاريخ"
- "حالة النظام"

### 📸 التقاط الصور
- "خذ صورة من الشاشة"
- "التقط سكرين شوت"

## 🏗️ البنية المعمارية

```
jarvis-ai/
├── backend/                 # Python FastAPI Server
│   ├── main.py             # Server الرئيسي
│   ├── command_processor.py # معالج الأوامر
│   ├── task_executor.py     # منفذ المهام
│   ├── integrations/        # التكاملات
│   └── requirements.txt     # المكتبات المطلوبة
│
├── web/                     # React Web App
│   ├── src/
│   │   ├── components/      # React Components
│   │   ├── App.tsx         # التطبيق الرئيسي
│   │   └── App.css         # الأنماط
│   └── package.json
│
└── desktop/                 # Electron Desktop App
    ├── public/main.js      # Electron Process
    ├── src/                # React Components
    └── package.json
```

## 🔧 API Endpoints

### `GET /`
معلومات عن النظام

### `GET /health`
حالة الخادم

### `POST /process-command`
معالجة أمر
```json
{
  "text": "افتح ملف جديد",
  "language": "ar"
}
```

### `GET /commands/list`
قائمة الأوامر المدعومة

### `WS /ws/voice`
WebSocket للتحكم الحي بالصوت

## 🔐 الخصوصية والأمان

- ✓ جميع البيانات محفوظة محلياً
- ✓ لا توجد حسابات سحابية مطلوبة
- ✓ لا توجد عمليات تتبع
- ✓ مفتوح المصدر - تحقق من الكود

## 📦 المكتبات المستخدمة

### Backend
- **FastAPI** - Web Framework
- **PyAutoGUI** - التحكم بالماوس والكيبورد
- **SpeechRecognition** - التعرف على الكلام
- **APScheduler** - جدولة المهام
- **SQLAlchemy** - قاعدة البيانات

### Frontend
- **React** - UI Framework
- **Axios** - HTTP Client
- **Web Speech API** - الاعتراف الصوتي

## 🐛 استكشاف الأخطاء

### الخادم لا يستجيب
```bash
# تحقق من أن الخادم يعمل
curl http://localhost:8000/health
```

### لا يعمل التعرف على الصوت
- استخدم متصفح Chrome أو Edge
- تأكد من السماح بالوصول إلى الميكروفون
- جرب الإدخال النصي بدلاً من الصوتي

### الأوامر لا تعمل
- تحقق من سجلات الخادم: `python main.py`
- جرب نفس الأمر عبر API مباشرة

## 🚀 التطوير والمساهمة

```bash
# 1. Clone المشروع
git clone https://github.com/yourusername/jarvis-ai.git

# 2. إنشاء فرع جديد
git checkout -b feature/my-feature

# 3. عمل التغييرات
# ...

# 4. Commit والـ Push
git add .
git commit -m "Add my feature"
git push origin feature/my-feature
```

## 📋 خريطة الطريق

- [ ] الدعم الكامل للعربية
- [ ] تكامل Home Assistant
- [ ] إرسال البريد الإلكتروني
- [ ] جدولة المهام المتقدمة
- [ ] تحديث التطبيق التلقائي
- [ ] التعرف على المستخدم بالصوت
- [ ] دعم أوامر مخصصة
- [ ] تطبيق على الهاتف

## 📞 الدعم والمساعدة

- 📝 [GitHub Issues](https://github.com/yourusername/jarvis-ai/issues)
- 💬 [Discussions](https://github.com/yourusername/jarvis-ai/discussions)
- 📧 البريد الإلكتروني: support@jarvis-ai.local

## 📄 الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE)

## ✍️ الكاتب

مطور JARVIS 🤖
- GitHub: [@yourusername](https://github.com/yourusername)

---

**استمتع باستخدام JARVIS!** 🚀
