#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  JARVIS Setup Script - إعداد نظام جارفيس
#  تشغيل: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║   🤖 إعداد نظام جارفيس الصوتي               ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Create directories
mkdir -p ~/.jarvis
mkdir -p ~/Pictures/jarvis_screenshots

echo -e "${YELLOW}[1/5] تثبيت المكتبات النظامية...${NC}"
if command -v apt-get &>/dev/null; then
    sudo apt-get update -q
    sudo apt-get install -y -q \
        python3-pip python3-dev portaudio19-dev \
        espeak espeak-data libespeak-dev \
        mpg123 ffmpeg scrot \
        python3-pyaudio \
        libportaudio2 libportaudiocpp0 \
        2>/dev/null || true
elif command -v dnf &>/dev/null; then
    sudo dnf install -y python3-pip portaudio-devel espeak espeak-devel mpg123 ffmpeg 2>/dev/null || true
elif command -v pacman &>/dev/null; then
    sudo pacman -S --noconfirm python-pip portaudio espeak mpg123 ffmpeg 2>/dev/null || true
fi

echo -e "${YELLOW}[2/5] تثبيت مكتبات Python...${NC}"
pip3 install --upgrade pip -q
pip3 install -r requirements.txt -q

echo -e "${YELLOW}[3/5] تثبيت Ollama (محرك الذكاء الاصطناعي المجاني)...${NC}"
if ! command -v ollama &>/dev/null; then
    echo "جاري تثبيت Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
    echo -e "${GREEN}✓ تم تثبيت Ollama${NC}"
else
    echo -e "${GREEN}✓ Ollama مثبّت مسبقاً${NC}"
fi

echo -e "${YELLOW}[4/5] تحميل نموذج الذكاء الاصطناعي...${NC}"
echo "جاري تحميل نموذج llama3.2 (حجم: ~2GB)..."
echo "هذا قد يستغرق بضع دقائق حسب سرعة الإنترنت..."
if command -v ollama &>/dev/null; then
    ollama pull llama3.2 2>&1 | tail -5
    echo -e "${GREEN}✓ تم تحميل النموذج${NC}"
fi

echo -e "${YELLOW}[5/5] اختبار النظام...${NC}"
python3 main.py --check

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ اكتمل الإعداد بنجاح!                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}طريقة التشغيل:${NC}"
echo "  python3 main.py              # وضع الصوت الكامل"
echo "  python3 main.py --text       # وضع النص (بدون ميكروفون)"
echo "  python3 main.py --web        # واجهة ويب للجوال (http://IP:5000)"
echo "  python3 main.py --telegram   # بوت تيليجرام"
echo "  python3 main.py --ha-setup   # دليل إعداد Home Assistant"
echo "  python3 main.py --check      # فحص المكتبات"
echo ""
echo -e "${YELLOW}للجوال:${NC}"
echo "  الويب:     شغّل --web ثم افتح http://$(hostname -I | awk '{print $1}'):5000"
echo "  تيليجرام: أضف TELEGRAM_BOT_TOKEN في config.py ثم شغّل --telegram"
echo ""
echo -e "${YELLOW}ملاحظة:${NC} تأكد من تشغيل Ollama بالأمر: ollama serve"
echo ""
