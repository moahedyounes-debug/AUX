# 🤖 JARVIS - المساعد الصوتي الذكي المجاني

نظام مساعد صوتي متكامل يعمل بالكامل **مجاناً** ويدعم العربية والإنجليزية.

## ✨ المميزات

| الميزة | التفاصيل |
|--------|----------|
| 🎤 التعرف على الصوت | Google STT (مجاني) أو Vosk/Whisper (بدون إنترنت) |
| 🔊 تحويل النص لكلام | pyttsx3 (مجاني، بدون إنترنت) |
| 🧠 الذكاء الاصطناعي | Ollama + llama3.2 (مجاني محلي بالكامل) |
| 🖥️ التحكم في الكمبيوتر | فتح التطبيقات، لقطات الشاشة، التحكم في الصوت |
| 🏠 البيت الذكي | Home Assistant (مفتوح المصدر، مجاني) |
| 🌐 الإنترنت | بحث DuckDuckGo، طقس، أخبار، يوتيوب |
| 📋 المهام | تذكيرات، مؤقتات، ملاحظات |

---

## 🚀 التثبيت السريع

```bash
cd jarvis
chmod +x setup.sh
./setup.sh
```

أو يدوياً:

```bash
# 1. مكتبات النظام (Ubuntu/Debian)
sudo apt install portaudio19-dev espeak mpg123 python3-pip

# 2. مكتبات Python
pip3 install -r requirements.txt

# 3. تثبيت Ollama (الذكاء الاصطناعي المجاني)
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2
```

---

## 🎮 التشغيل

```bash
# وضع الصوت الكامل (يحتاج ميكروفون)
python3 main.py

# وضع النص فقط (بدون ميكروفون)
python3 main.py --text

# اختيار محرك الذكاء الاصطناعي
python3 main.py --engine ollama    # مجاني محلي (الافتراضي)
python3 main.py --engine claude    # Claude API
python3 main.py --engine openai    # OpenAI

# اختيار محرك التعرف على الصوت
python3 main.py --stt google      # Google (يحتاج إنترنت)
python3 main.py --stt vosk        # بدون إنترنت
python3 main.py --stt whisper     # بدون إنترنت

# فحص المكتبات
python3 main.py --check
```

---

## 🗣️ أمثلة على الأوامر

### التحكم في الكمبيوتر
```
"جارفيس افتح المتصفح"
"جارفيس التقط لقطة شاشة"
"جارفيس شغّل سبوتيفاي"
"جارفيس اغلق المتصفح"
"جارفيس ارفع الصوت"
"جارفيس قفّل الشاشة"
```

### التحكم في البيت
```
"جارفيس شغّل ضوء غرفة النوم"
"جارفيس أطفئ المروحة في الصالة"
"جارفيس اضبط التكييف على 22 درجة"
"جارفيس افتح الستائر"
```

### الإنترنت والمعلومات
```
"جارفيس ابحث عن وصفة كنافة"
"جارفيس كيف الطقس في الرياض"
"جارفيس أخبار اليوم"
"جارفيس ابحث في يوتيوب عن موسيقى هادئة"
```

### المهام والتذكيرات
```
"جارفيس ذكّرني بعد 30 دقيقة بالدواء"
"جارفيس ضع مؤقت لمدة 10 دقائق"
"جارفيس سجّل ملاحظة: اشتري حليب"
"جارفيس أضف مهمة: مراجعة التقرير"
"جارفيس كم الساعة"
"جارفيس ما التاريخ اليوم"
"جارفيس احسب 15 في 24"
```

---

## ⚙️ الإعداد

### 1. إعداد Home Assistant (للبيت الذكي)
```python
# في config.py
HOME_ASSISTANT_URL = "http://localhost:8123"
HOME_ASSISTANT_TOKEN = "your-long-lived-access-token"
```

### 2. إضافة أجهزة البيت
```python
DEVICES = {
    "غرفة_النوم": {
        "ضوء": "light.bedroom_light",      # Entity ID من Home Assistant
        "مروحة": "switch.bedroom_fan",
    },
}
```

### 3. استخدام Claude AI (اختياري)
```bash
export ANTHROPIC_API_KEY="your-api-key"
python3 main.py --engine claude
```

### 4. الأصوات العربية (pyttsx3)
على Linux، ثبّت حزمة الصوت:
```bash
sudo apt install espeak-ng-data
# أو للعربية:
sudo apt install libespeak-ng1
```

---

## 🏗️ هيكل المشروع

```
jarvis/
├── main.py              # نقطة الدخول الرئيسية
├── config.py            # إعدادات النظام
├── requirements.txt     # المكتبات المطلوبة
├── setup.sh             # سكريبت الإعداد التلقائي
├── voice/
│   ├── listener.py      # التعرف على الصوت (STT)
│   └── speaker.py       # تحويل النص لكلام (TTS)
├── ai/
│   └── brain.py         # محرك الذكاء الاصطناعي
├── commands/
│   ├── computer.py      # التحكم في الكمبيوتر
│   ├── home.py          # التحكم في البيت الذكي
│   ├── web.py           # البحث والمعلومات
│   └── tasks.py         # المهام والتذكيرات
└── utils/
    └── helpers.py       # أدوات مساعدة
```

---

## 🆓 الأدوات المجانية المستخدمة

| الأداة | الاستخدام | الرابط |
|--------|-----------|--------|
| **Ollama** | ذكاء اصطناعي محلي مجاني | [ollama.ai](https://ollama.ai) |
| **llama3.2** | نموذج اللغة | مدمج مع Ollama |
| **Google STT** | تعرف على الصوت | مجاني عبر SpeechRecognition |
| **pyttsx3** | TTS بدون إنترنت | pip install pyttsx3 |
| **Home Assistant** | أتمتة المنزل | [home-assistant.io](https://www.home-assistant.io) |
| **Open-Meteo** | بيانات الطقس | [open-meteo.com](https://open-meteo.com) |
| **DuckDuckGo** | بحث بدون API | مدمج |

---

## 🔧 حل المشكلات الشائعة

**خطأ: No module named 'pyaudio'**
```bash
sudo apt install portaudio19-dev python3-pyaudio
pip3 install pyaudio
```

**خطأ: Ollama not running**
```bash
ollama serve &
ollama pull llama3.2
```

**الصوت لا يعمل (Linux)**
```bash
sudo apt install espeak mpg123
pip3 install gtts  # بديل TTS
```
