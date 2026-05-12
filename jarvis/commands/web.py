"""
Web & Information - Search, weather, news, time, date
All free - uses DuckDuckGo and open APIs
"""

import datetime
import logging
import webbrowser
import urllib.parse

logger = logging.getLogger("jarvis.web")


class WebController:
    def __init__(self, config):
        self.config = config

    def handle(self, intent: dict) -> str:
        action = intent.get("action", "").lower()
        target = intent.get("target", "").lower()
        params = intent.get("params", {})
        query = params.get("query", target)

        if any(w in action for w in ["ابحث", "بحث", "search", "ابحث عن"]):
            return self.search(query)
        elif any(w in action for w in ["طقس", "weather", "حالة الجو"]):
            return self.get_weather(query)
        elif any(w in action for w in ["أخبار", "news", "اخبار"]):
            return self.get_news(query)
        elif any(w in action for w in ["وقت", "ساعة", "time"]):
            return self.get_time()
        elif any(w in action for w in ["تاريخ", "يوم", "date"]):
            return self.get_date()
        elif any(w in action for w in ["افتح", "open", "انتقل"]):
            return self.open_url(target)
        elif any(w in action for w in ["يوتيوب", "youtube"]):
            return self.search_youtube(query)
        else:
            return self.search(query or action)

    def search(self, query: str) -> str:
        """Search using DuckDuckGo (no API key needed)."""
        if not query:
            return "ماذا تريد أن تبحث عنه؟"
        try:
            # Try duckduckgo-search library first
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, max_results=3))
                if results:
                    top = results[0]
                    title = top.get("title", "")
                    body = top.get("body", "")
                    url = top.get("href", "")
                    response = f"{title}: {body[:200]}"
                    if url:
                        webbrowser.open(url)
                    return response
            except ImportError:
                pass

            # Fallback: open browser with DuckDuckGo
            encoded = urllib.parse.quote(query)
            url = f"https://duckduckgo.com/?q={encoded}"
            webbrowser.open(url)
            return f"تم فتح نتائج البحث عن: {query}"
        except Exception as e:
            logger.error(f"Search error: {e}")
            return "تعذّر إجراء البحث"

    def get_weather(self, city: str = "") -> str:
        """Get weather using Open-Meteo (completely free, no API key)."""
        try:
            import requests

            # Get coordinates first using geocoding
            if not city or city in ["طقس", "weather", "الجو"]:
                city = "Riyadh"  # Default city

            # Geocoding with nominatim (free)
            geo_url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(city)}&format=json&limit=1"
            geo_r = requests.get(geo_url, timeout=5, headers={"User-Agent": "JarvisBot/1.0"})
            geo_data = geo_r.json()

            if not geo_data:
                return f"لم أجد مدينة: {city}"

            lat = geo_data[0]["lat"]
            lon = geo_data[0]["lon"]
            city_name = geo_data[0].get("display_name", city).split(",")[0]

            # Weather from Open-Meteo (free, no API key)
            weather_url = (
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={lat}&longitude={lon}"
                f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
                f"&timezone=auto"
            )
            w_r = requests.get(weather_url, timeout=5)
            w_data = w_r.json()
            current = w_data.get("current", {})

            temp = current.get("temperature_2m", "?")
            humidity = current.get("relative_humidity_2m", "?")
            wind = current.get("wind_speed_10m", "?")
            code = current.get("weather_code", 0)

            condition = self._weather_code_to_arabic(code)
            return (
                f"الطقس في {city_name}: {condition}\n"
                f"الحرارة: {temp}°C | الرطوبة: {humidity}% | الريح: {wind} كم/س"
            )
        except Exception as e:
            logger.error(f"Weather error: {e}")
            return "تعذّر الحصول على معلومات الطقس"

    def _weather_code_to_arabic(self, code: int) -> str:
        if code == 0:
            return "صافٍ ☀️"
        elif code in (1, 2, 3):
            return "غائم جزئياً ⛅"
        elif code in (45, 48):
            return "ضبابي 🌫️"
        elif code in (51, 53, 55, 61, 63, 65):
            return "ممطر 🌧️"
        elif code in (71, 73, 75):
            return "ثلجي ❄️"
        elif code in (80, 81, 82):
            return "أمطار غزيرة 🌩️"
        elif code in (95, 96, 99):
            return "عاصفة رعدية ⛈️"
        return "غير معروف"

    def get_news(self, topic: str = "") -> str:
        """Get news headlines using free RSS feeds."""
        try:
            import requests
            import xml.etree.ElementTree as ET

            # Free Arabic news RSS (BBC Arabic)
            rss_url = "https://feeds.bbci.co.uk/arabic/rss.xml"
            r = requests.get(rss_url, timeout=5)
            root = ET.fromstring(r.content)

            items = root.findall(".//item")[:5]
            if not items:
                return "لا توجد أخبار متاحة الآن"

            headlines = []
            for item in items:
                title = item.find("title")
                if title is not None and title.text:
                    headlines.append(f"• {title.text.strip()}")

            result = "آخر الأخبار:\n" + "\n".join(headlines)
            return result
        except Exception as e:
            logger.error(f"News error: {e}")
            # Fallback: open browser
            webbrowser.open("https://arabic.rt.com/")
            return "تم فتح الأخبار في المتصفح"

    def get_time(self) -> str:
        now = datetime.datetime.now()
        h = now.hour
        m = now.minute
        period = "صباحاً" if h < 12 else ("ظهراً" if h < 13 else "مساءً")
        h12 = h if h <= 12 else h - 12
        return f"الوقت الآن: {h12}:{m:02d} {period}"

    def get_date(self) -> str:
        now = datetime.datetime.now()
        days_ar = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
        months_ar = [
            "", "يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ]
        day_name = days_ar[now.weekday()]
        return f"اليوم {day_name} {now.day} {months_ar[now.month]} {now.year}"

    def open_url(self, url: str) -> str:
        if not url.startswith("http"):
            url = "https://" + url
        try:
            webbrowser.open(url)
            return f"تم فتح: {url}"
        except Exception as e:
            logger.error(f"Open URL error: {e}")
            return "تعذّر فتح الرابط"

    def search_youtube(self, query: str) -> str:
        if not query:
            webbrowser.open("https://youtube.com")
            return "تم فتح يوتيوب"
        encoded = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded}"
        webbrowser.open(url)
        return f"تم البحث في يوتيوب عن: {query}"
