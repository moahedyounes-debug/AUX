"""
Home Automation - Smart home control via Home Assistant REST API
Home Assistant is free and open-source: https://www.home-assistant.io
"""

import logging
import re
from typing import Optional

logger = logging.getLogger("jarvis.home")


class HomeController:
    def __init__(self, config):
        self.config = config
        self.ha_url = config.HOME_ASSISTANT_URL.rstrip("/")
        self.token = config.HOME_ASSISTANT_TOKEN
        self.devices = config.DEVICES
        self._headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def _is_configured(self) -> bool:
        return bool(self.token)

    def handle(self, intent: dict) -> str:
        action = intent.get("action", "").lower()
        target = intent.get("target", "").lower()
        params = intent.get("params", {})

        if not self._is_configured():
            return self._simulate(action, target, params)

        # Determine power state
        turn_on = self._is_turn_on(action)

        # Find device entity
        entity_id = self._resolve_entity(target, params)
        if not entity_id:
            return f"لم أجد الجهاز: {target}"

        # Determine service call
        domain = entity_id.split(".")[0]
        service = self._get_service(domain, action, turn_on, params)

        return self._call_service(domain, service, entity_id, params)

    def _simulate(self, action: str, target: str, params: dict) -> str:
        """Simulate home control when HA is not configured."""
        turn_on = self._is_turn_on(action)
        state = "تشغيل" if turn_on else "إيقاف"
        room, device = self._extract_room_device(target)

        if room and device:
            return f"تم {state} {device} في {room} ✓ (وضع المحاكاة - اضبط Home Assistant للتحكم الفعلي)"
        elif device or target:
            name = device or target
            return f"تم {state} {name} ✓ (وضع المحاكاة)"
        return f"تم تنفيذ: {action} {target} (وضع المحاكاة)"

    def _is_turn_on(self, action: str) -> bool:
        on_words = ["شغّل", "شغل", "افتح", "فعّل", "فعل", "on", "turn on", "enable", "open"]
        off_words = ["أطفئ", "اطفئ", "اغلق", "أوقف", "off", "turn off", "disable", "close"]
        for w in on_words:
            if w in action:
                return True
        for w in off_words:
            if w in action:
                return False
        return True  # Default to on

    def _resolve_entity(self, target: str, params: dict) -> Optional[str]:
        # Check if entity_id provided directly
        if "entity_id" in params:
            return params["entity_id"]

        # Search device map
        room, device = self._extract_room_device(target)
        if room and device:
            room_devices = self.devices.get(room, {})
            return room_devices.get(device)

        # Fallback: search all devices
        for room_name, devices in self.devices.items():
            for dev_name, entity_id in devices.items():
                if dev_name in target or target in dev_name:
                    return entity_id

        return None

    def _extract_room_device(self, target: str):
        for room in self.devices:
            if room in target:
                for device in self.devices[room]:
                    if device in target:
                        return room, device
                # Room found but device not specified - return first device
                devices = list(self.devices[room].keys())
                if devices:
                    return room, devices[0]
        # Check device names globally
        for room, devices in self.devices.items():
            for device in devices:
                if device in target:
                    return room, device
        return None, None

    def _get_service(self, domain: str, action: str, turn_on: bool, params: dict) -> str:
        if domain == "light":
            if "brightness" in params or "سطوع" in action:
                return "turn_on"
            return "turn_on" if turn_on else "turn_off"
        elif domain == "switch":
            return "turn_on" if turn_on else "turn_off"
        elif domain == "climate":
            if not turn_on:
                return "turn_off"
            return "set_hvac_mode"
        elif domain == "cover":
            if "افتح" in action or "open" in action:
                return "open_cover"
            elif "اغلق" in action or "close" in action:
                return "close_cover"
            return "open_cover" if turn_on else "close_cover"
        elif domain == "media_player":
            return "turn_on" if turn_on else "turn_off"
        return "turn_on" if turn_on else "turn_off"

    def _call_service(self, domain: str, service: str, entity_id: str, params: dict) -> str:
        try:
            import requests
            data = {"entity_id": entity_id}

            # Handle brightness for lights
            if domain == "light" and "brightness" in params:
                brightness = int(params["brightness"])
                data["brightness_pct"] = max(0, min(100, brightness))

            # Handle temperature for climate
            if domain == "climate":
                if "temperature" in params:
                    data["temperature"] = float(params["temperature"])
                if service == "set_hvac_mode":
                    data["hvac_mode"] = params.get("mode", "cool")

            url = f"{self.ha_url}/api/services/{domain}/{service}"
            r = requests.post(url, json=data, headers=self._headers, timeout=5)

            if r.status_code in (200, 201):
                state_ar = "تشغيل" if "on" in service or "open" in service else "إيقاف"
                return f"تم {state_ar} الجهاز بنجاح ✓"
            else:
                logger.error(f"HA API error: {r.status_code} - {r.text}")
                return f"حدث خطأ في التحكم: {r.status_code}"
        except Exception as e:
            logger.error(f"Home control error: {e}")
            return "تعذّر الاتصال بـ Home Assistant"

    def get_device_state(self, entity_id: str) -> dict:
        """Get the current state of a device."""
        try:
            import requests
            url = f"{self.ha_url}/api/states/{entity_id}"
            r = requests.get(url, headers=self._headers, timeout=5)
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            logger.error(f"Get state error: {e}")
        return {}

    def list_devices(self) -> str:
        """Return a summary of all configured devices."""
        lines = ["الأجهزة المتاحة:"]
        for room, devices in self.devices.items():
            lines.append(f"\n{room}:")
            for dev_name in devices:
                lines.append(f"  - {dev_name}")
        return "\n".join(lines)

    def set_scene(self, scene_name: str) -> str:
        """Activate a Home Assistant scene."""
        if not self._is_configured():
            return f"تم تفعيل المشهد: {scene_name} (محاكاة)"
        try:
            import requests
            url = f"{self.ha_url}/api/services/scene/turn_on"
            r = requests.post(
                url,
                json={"entity_id": f"scene.{scene_name}"},
                headers=self._headers,
                timeout=5,
            )
            if r.status_code in (200, 201):
                return f"تم تفعيل المشهد: {scene_name}"
            return "لم أجد هذا المشهد"
        except Exception as e:
            logger.error(f"Scene error: {e}")
            return "تعذّر تفعيل المشهد"
