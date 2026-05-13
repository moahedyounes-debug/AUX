"""
Home Assistant Mobile Setup Helper
Guides the user through HA setup and generates automations for JARVIS voice commands.
Run: python3 commands/home_assistant_setup.py
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config as CONFIG


HA_AUTOMATION_TEMPLATE = """
# أتمتة Home Assistant لجارفيس - جاهزة للنسخ في automations.yaml

# ── تشغيل الضوء ─────────────────────────────────────────
- alias: "JARVIS - شغّل الضوء"
  trigger:
    platform: webhook
    webhook_id: jarvis_light_on
  action:
    service: light.turn_on
    target:
      entity_id: "{{ trigger.json.entity_id }}"

# ── إيقاف الضوء ─────────────────────────────────────────
- alias: "JARVIS - أطفئ الضوء"
  trigger:
    platform: webhook
    webhook_id: jarvis_light_off
  action:
    service: light.turn_off
    target:
      entity_id: "{{ trigger.json.entity_id }}"

# ── ضبط درجة الحرارة ────────────────────────────────────
- alias: "JARVIS - ضبط التكييف"
  trigger:
    platform: webhook
    webhook_id: jarvis_climate_set
  action:
    service: climate.set_temperature
    target:
      entity_id: "{{ trigger.json.entity_id }}"
    data:
      temperature: "{{ trigger.json.temperature }}"
"""

HA_MOBILE_CONFIG = """
# ── إضافة JARVIS كـ Dashboard في Home Assistant ──────────

# 1. افتح Home Assistant على الجوال
# 2. اذهب إلى Settings → Dashboards → Add Dashboard
# 3. اسمه "JARVIS" واختر icon: mdi:robot

# ── Lovelace Card للتحكم الصوتي ────────────────────────
# أضف هذه البطاقة في Dashboard:

type: custom:mushroom-template-card
primary: جارفيس
secondary: اضغط للتحدث
icon: mdi:microphone
tap_action:
  action: call-service
  service: assist_satellite.start_conversation
"""


def check_ha_connection() -> bool:
    try:
        import requests
        r = requests.get(
            f"{CONFIG.HOME_ASSISTANT_URL}/api/",
            headers={"Authorization": f"Bearer {CONFIG.HOME_ASSISTANT_TOKEN}"},
            timeout=3,
        )
        return r.status_code == 200
    except Exception:
        return False


def get_ha_entities():
    try:
        import requests
        r = requests.get(
            f"{CONFIG.HOME_ASSISTANT_URL}/api/states",
            headers={"Authorization": f"Bearer {CONFIG.HOME_ASSISTANT_TOKEN}"},
            timeout=5,
        )
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return []


def generate_config_devices(entities: list) -> dict:
    """Auto-generate DEVICES config from HA entities."""
    domains = {"light": "ضوء", "switch": "مفتاح", "climate": "تكييف",
               "cover": "ستائر", "media_player": "تلفزيون"}
    rooms_ar = {
        "bedroom": "غرفة_النوم", "living": "الصالة", "kitchen": "المطبخ",
        "bathroom": "الحمام", "outdoor": "الخارج", "office": "المكتب",
    }
    devices = {}
    for entity in entities:
        eid = entity.get("entity_id", "")
        domain = eid.split(".")[0]
        if domain not in domains:
            continue
        name = eid.split(".")[1]
        # Guess room
        room = "عام"
        for eng, ar in rooms_ar.items():
            if eng in name:
                room = ar
                break
        devices.setdefault(room, {})
        devices[room][domains[domain]] = eid
    return devices


def print_setup_guide():
    connected = check_ha_connection()

    print("""
╔══════════════════════════════════════════════════════════╗
║   🏠 إعداد Home Assistant مع جارفيس                     ║
╚══════════════════════════════════════════════════════════╝
""")

    # ── Step 1: Install HA ─────────────────────────────────
    print("📦 الخطوة 1: تثبيت Home Assistant (مجاني)")
    print("─" * 50)
    print("""
  الخيار أ - على Raspberry Pi (الأفضل):
    https://www.home-assistant.io/installation/raspberrypi

  الخيار ب - Docker (على نفس الكمبيوتر):
    docker run -d --name homeassistant \\
      --network=host \\
      -v /home/user/homeassistant:/config \\
      ghcr.io/home-assistant/home-assistant:stable

  الخيار ج - على Windows/Mac:
    https://www.home-assistant.io/installation/windows
""")

    # ── Step 2: Token ──────────────────────────────────────
    print("🔑 الخطوة 2: الحصول على Access Token")
    print("─" * 50)
    print("""
  1. افتح Home Assistant: http://localhost:8123
  2. اذهب إلى: Profile → Long-Lived Access Tokens
  3. اضغط "Create Token" واختر اسماً (مثل: jarvis)
  4. انسخ التوكن وضعه في config.py:

     HOME_ASSISTANT_TOKEN = "eyJ0eXAiOiJKV1Q..."
""")

    # ── Step 3: Connection status ──────────────────────────
    print("🔌 الخطوة 3: اختبار الاتصال")
    print("─" * 50)
    if connected:
        print(f"  ✅ متصل بـ Home Assistant على {CONFIG.HOME_ASSISTANT_URL}")
        entities = get_ha_entities()
        if entities:
            print(f"  📊 عدد الأجهزة المكتشفة: {len(entities)}")
            auto_devices = generate_config_devices(entities)
            if auto_devices:
                print("\n  💡 الأجهزة المكتشفة تلقائياً (للإضافة في config.py):")
                print(f"  DEVICES = {json.dumps(auto_devices, ensure_ascii=False, indent=4)}")
    else:
        print(f"  ❌ لا يوجد اتصال بـ {CONFIG.HOME_ASSISTANT_URL}")
        print("  تأكد من تشغيل Home Assistant وصحة الإعدادات في config.py")

    # ── Step 4: Mobile App ────────────────────────────────
    print("\n📱 الخطوة 4: تطبيق الجوال (مجاني)")
    print("─" * 50)
    print("""
  Android: https://play.google.com/store/apps/details?id=io.homeassistant.companion.android
  iOS:     https://apps.apple.com/app/home-assistant/id1099568401

  بعد التثبيت:
  1. افتح التطبيق
  2. أدخل عنوان السيرفر: http://<IP-الكمبيوتر>:8123
  3. سجّل الدخول بنفس الحساب
  4. ستظهر كل أجهزتك تلقائياً!
""")

    # ── Step 5: Nabu Casa (optional cloud) ───────────────
    print("☁️ الخطوة 5: الوصول من خارج المنزل (اختياري)")
    print("─" * 50)
    print("""
  الخيار المجاني - DuckDNS + Let's Encrypt:
    https://www.home-assistant.io/docs/configuration/remote/

  الخيار المدفوع (اختياري) - Nabu Casa ($6.50/شهر):
    يعطيك عنوان ثابت + Alexa + Google Assistant
""")

    # ── Step 6: Voice Assistant ───────────────────────────
    print("🎤 الخطوة 6: المساعد الصوتي في HA")
    print("─" * 50)
    print("""
  Home Assistant يدعم الآن Assist (مجاني):
  Settings → Voice Assistants → Assist

  يمكنك استخدام:
  - Wyoming Protocol (محلي مجاني)
  - Whisper (STT) + Piper (TTS) مجاناً عبر Add-ons
""")

    print("\n" + "═" * 50)
    print("📄 أتمتة جاهزة للنسخ:")
    print(HA_AUTOMATION_TEMPLATE)
    print("═" * 50 + "\n")


if __name__ == "__main__":
    print_setup_guide()
