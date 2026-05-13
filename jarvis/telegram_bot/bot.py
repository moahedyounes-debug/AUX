"""
JARVIS Telegram Bot
Send commands to JARVIS from anywhere via Telegram - completely free!

Setup:
1. Talk to @BotFather on Telegram → /newbot → copy the token
2. Set TELEGRAM_BOT_TOKEN in config.py or as env variable
3. Run: python3 telegram_bot/bot.py
"""

import sys
import os
import logging
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config as CONFIG
from ai.brain import AIBrain
from commands.computer import ComputerController
from commands.home import HomeController
from commands.web import WebController
from commands.tasks import TaskController

logger = logging.getLogger("jarvis.telegram")

# JARVIS engine instances
brain = AIBrain(CONFIG)
computer = ComputerController(CONFIG)
home_ctrl = HomeController(CONFIG)
web_ctrl = WebController(CONFIG)
tasks_ctrl = TaskController(CONFIG)

WELCOME = """🤖 *مرحباً! أنا جارفيس*

أرسل لي أي أمر وسأنفّذه على الكمبيوتر أو في البيت!

/help - قائمة الأوامر
/home - التحكم في البيت
/status - حالة النظام
"""

HELP_TEXT = """*أوامر جارفيس:*

🖥️ *الكمبيوتر:*
`افتح المتصفح`
`لقطة شاشة`
`ارفع الصوت`

🏠 *البيت الذكي:*
`شغّل ضوء الصالة`
`أطفئ المروحة`
`اضبط التكييف 22 درجة`

🌐 *الإنترنت:*
`ابحث عن وصفة كنافة`
`كيف الطقس في الرياض`
`أخبار اليوم`

📋 *المهام:*
`ذكّرني بعد 30 دقيقة بالدواء`
`ضع مؤقت 10 دقائق`
`احسب 15 × 24`

💬 *محادثة:*
`كم الساعة`
`من أنت`
`مساعدة`
"""


def process_command(text: str) -> str:
    """Process a text command through JARVIS pipeline."""
    t = text.lower().strip()

    # Fast built-ins
    if any(w in t for w in ["الوقت", "كم الساعة"]):
        return web_ctrl.get_time()
    if any(w in t for w in ["التاريخ", "اليوم"]):
        return web_ctrl.get_date()
    if any(w in t for w in ["كيف حالك", "من أنت"]):
        return "أنا جارفيس، مساعدك الذكي على الكمبيوتر والبيت! 🤖"

    try:
        intent = brain.understand(text)
        intent_type = intent.get("intent", "general")
        if intent_type == "computer":
            return computer.handle(intent)
        elif intent_type == "home":
            return home_ctrl.handle(intent)
        elif intent_type == "web":
            return web_ctrl.handle(intent)
        elif intent_type == "task":
            return tasks_ctrl.handle(intent)
        else:
            return intent.get("response") or brain.chat(text)
    except Exception as e:
        logger.error(f"Command error: {e}")
        return "حدث خطأ أثناء التنفيذ، يرجى المحاولة مجدداً"


def run_bot():
    token = getattr(CONFIG, "TELEGRAM_BOT_TOKEN", "") or os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        print("""
╔════════════════════════════════════════════════════╗
║  ❌ لم يتم ضبط TELEGRAM_BOT_TOKEN                 ║
║                                                    ║
║  الخطوات:                                         ║
║  1. افتح Telegram وابحث عن @BotFather             ║
║  2. أرسل /newbot واتبع التعليمات                  ║
║  3. انسخ التوكن وضعه في config.py:                ║
║     TELEGRAM_BOT_TOKEN = "123456:ABC..."           ║
║  4. أعد تشغيل البوت                               ║
╚════════════════════════════════════════════════════╝
""")
        return

    try:
        from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
        from telegram.ext import (
            Application, CommandHandler, MessageHandler,
            CallbackQueryHandler, filters, ContextTypes
        )
    except ImportError:
        print("تثبيت: pip install python-telegram-bot")
        return

    async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text(WELCOME, parse_mode="Markdown")

    async def help_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text(HELP_TEXT, parse_mode="Markdown")

    async def status_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        import platform
        info = (
            f"🟢 *جارفيس يعمل*\n\n"
            f"🖥️ النظام: {platform.system()}\n"
            f"🤖 محرك AI: {CONFIG.AI_ENGINE}\n"
            f"🎤 STT: {CONFIG.STT_ENGINE}\n"
            f"📅 {web_ctrl.get_date()}\n"
            f"🕐 {web_ctrl.get_time()}"
        )
        await update.message.reply_text(info, parse_mode="Markdown")

    async def home_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        buttons = []
        for room, devices in CONFIG.DEVICES.items():
            row = []
            for dev in devices:
                label = f"💡 {dev}" if "ضوء" in dev else f"🔌 {dev}"
                row.append(InlineKeyboardButton(label, callback_data=f"home:on:{room}:{dev}"))
            if row:
                buttons.append(row)
        if buttons:
            markup = InlineKeyboardMarkup(buttons)
            await update.message.reply_text("🏠 اختر الجهاز:", reply_markup=markup)
        else:
            await update.message.reply_text("لا توجد أجهزة مضبوطة في config.py")

    async def button_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        data = query.data.split(":")
        if data[0] == "home" and len(data) == 4:
            _, state, room, device = data
            intent = {
                "intent": "home",
                "action": "شغّل" if state == "on" else "أطفئ",
                "target": f"{device} {room}",
                "params": {},
            }
            result = home_ctrl.handle(intent)
            # Toggle the button state
            new_state = "off" if state == "on" else "on"
            markup = InlineKeyboardMarkup([[
                InlineKeyboardButton(
                    "🔴 إيقاف" if state == "on" else "🟢 تشغيل",
                    callback_data=f"home:{new_state}:{room}:{device}"
                )
            ]])
            await query.edit_message_text(f"✅ {result}", reply_markup=markup)

    async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        text = update.message.text
        # Show typing indicator
        await ctx.bot.send_chat_action(update.effective_chat.id, "typing")
        result = process_command(text)
        await update.message.reply_text(result)

    async def handle_voice(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        """Handle voice messages sent to the bot."""
        await update.message.reply_text(
            "🎤 استلمت رسالة صوتية!\n"
            "للأسف تحتاج Whisper لتحويلها لنص. "
            "في الوقت الحالي، اكتب الأمر نصياً."
        )

    # Build and run
    app_bot = Application.builder().token(token).build()
    app_bot.add_handler(CommandHandler("start", start))
    app_bot.add_handler(CommandHandler("help", help_cmd))
    app_bot.add_handler(CommandHandler("status", status_cmd))
    app_bot.add_handler(CommandHandler("home", home_cmd))
    app_bot.add_handler(CallbackQueryHandler(button_callback))
    app_bot.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app_bot.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    print("""
╔═══════════════════════════════════════════╗
║   🤖 بوت جارفيس التيليجرام يعمل!         ║
║   افتح تيليجرام وابدأ المحادثة           ║
║   اضغط Ctrl+C للإيقاف                    ║
╚═══════════════════════════════════════════╝
""")
    app_bot.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    run_bot()
