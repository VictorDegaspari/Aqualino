"""ADB transport. No third-party Python packages or device reset required."""

import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import time

from .ui import Hierarchy, NavigationError

PACKAGE = "com.aqualino"
ACTIVITY = "com.aqualino/.MainActivity"


def find_adb(explicit=None):
    candidates = [explicit, os.environ.get("AQUALINO_ADB")]
    for variable in ("ANDROID_HOME", "ANDROID_SDK_ROOT"):
        if os.environ.get(variable):
            candidates.append(str(Path(os.environ[variable]) / "platform-tools/adb"))
    candidates += [str(Path.home() / "Android/Sdk/platform-tools/adb"), shutil.which("adb")]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(candidate)
    raise NavigationError("ADB não encontrado. Defina ANDROID_HOME ou AQUALINO_ADB.")


def run(arguments, timeout=20, binary=False, sensitive=False):
    try:
        result = subprocess.run(arguments, capture_output=True, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise NavigationError("O comando ADB não terminou. Confira a conexão USB e execute doctor.") from error
    if result.returncode:
        detail = "" if sensitive else result.stderr.decode(errors="replace").strip()[:400]
        raise NavigationError(f"Falha no ADB. {detail}".strip())
    return result.stdout if binary else result.stdout.decode(errors="replace")


class Android:
    def __init__(self, serial=None, adb=None):
        self.adb = find_adb(adb)
        output = run([self.adb, "devices"])
        devices = [line.split()[:2] for line in output.splitlines()[1:] if line.strip()]
        requested = serial or os.environ.get("ANDROID_SERIAL")
        ready = [name for name, status in devices if status == "device"]
        if requested and requested not in ready:
            raise NavigationError("O dispositivo selecionado está desconectado ou sem autorização USB.")
        if not requested and len(ready) != 1:
            raise NavigationError("Conecte um Android autorizado; com vários aparelhos use --serial ou ANDROID_SERIAL.")
        self.serial = requested or ready[0]

    def command(self, *arguments, **kwargs):
        return run([self.adb, "-s", self.serial, *arguments], **kwargs)

    def shell(self, *arguments, **kwargs):
        # ADB passes shell arguments through the device shell: quote on that side too.
        return self.command("shell", shlex.join(str(argument) for argument in arguments), **kwargs)

    def locked(self):
        policy = self.shell("dumpsys", "window", "policy")
        return bool(re.search(r"(?:showing|mIsShowing|mShowingLockscreen|mKeyguardShowing)=true\b", policy))

    def require_unlocked(self):
        if self.locked():
            raise NavigationError("Android bloqueado. Desbloqueie o aparelho manualmente e mantenha a tela ligada.")

    def doctor(self):
        package = self.shell("pm", "path", PACKAGE).strip()
        window = self.shell("dumpsys", "window", "windows")
        focus = re.search(r"mCurrentFocus=(.+)", window)
        return {"serial": self.serial, "adb": self.adb, "installed": package.startswith("package:"),
                "locked": self.locked(), "focus": focus.group(1) if focus else None}

    def connect(self):
        for port in (8080, 8081):
            self.command("reverse", f"tcp:{port}", f"tcp:{port}")

    def launch(self, path=None):
        self.require_unlocked()
        args = ["am", "start", "-W", "-n", ACTIVITY]
        if path:
            args += ["-a", "android.intent.action.VIEW", "-d", f"aqualino://{path}"]
        result = self.shell(*args)
        if "Error:" in result or "Exception" in result:
            raise NavigationError("O Android não conseguiu abrir o Aqualino. Confira a instalação com doctor.")

    def hierarchy(self):
        path = f"/data/local/tmp/aqualino-nav-{os.getpid()}.xml"
        try:
            result = self.shell("uiautomator", "dump", path, timeout=25)
            if "ERROR" in result:
                raise NavigationError("O UI Automator não conseguiu ler a tela. Aguarde a transição e execute inspect novamente.")
            return Hierarchy(self.command("exec-out", "cat", path))
        finally:
            self.shell("rm", "-f", path)

    def screenshot(self, path):
        image = self.command("exec-out", "screencap", "-p", binary=True)
        if not image.startswith(b"\x89PNG\r\n\x1a\n"):
            raise NavigationError("O Android não retornou uma captura PNG válida.")
        path.write_bytes(image)

    def tap(self, node):
        if node.attrs.get("selected") == "true" and not node.enabled:
            return
        x1, y1, x2, y2 = node.bounds
        self.shell("input", "tap", (x1 + x2) // 2, (y1 + y2) // 2)

    def back(self):
        self.shell("input", "keyevent", "KEYCODE_BACK")

    def fill(self, node, text):
        if not text or not text.isascii() or any(ord(char) < 32 for char in text) or "%s" in text:
            raise NavigationError("O teclado ADB aceita texto ASCII simples. Use o teclado do aparelho para acentos ou %s literal.")
        self.tap(node)
        self.shell("input", "keyevent", "KEYCODE_MOVE_END")
        count = len(node.attrs.get("text", ""))
        if count > 1024:
            raise NavigationError("Campo muito longo. Limpe-o manualmente antes de preencher.")
        self.shell("input", "keyevent", *(["KEYCODE_DEL"] * (count + 1)))
        self.shell("input", "text", text.replace(" ", "%s"), sensitive=True)

    def scroll(self, hierarchy, direction, selector=None):
        candidates = hierarchy.matches(selector) if selector else [
            node for node in hierarchy.nodes if node.visible and node.attrs.get("scrollable") == "true"
            and node.attrs.get("package") == PACKAGE]
        if not candidates:
            raise NavigationError("Nenhuma área rolável visível. Execute inspect.")
        node = max(candidates, key=lambda item: (item.bounds[2] - item.bounds[0]) * (item.bounds[3] - item.bounds[1]))
        x1, y1, x2, y2 = node.bounds
        x = (x1 + x2) // 2
        top, bottom = int(y1 + (y2 - y1) * .25), int(y1 + (y2 - y1) * .75)
        start, end = (bottom, top) if direction == "down" else (top, bottom)
        self.shell("input", "swipe", x, start, x, end, 350)
        time.sleep(.2)
