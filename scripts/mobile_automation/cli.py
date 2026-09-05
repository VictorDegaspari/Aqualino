"""Navigation by deep links and current native controls, with JSON evidence."""

import argparse
from datetime import datetime, timezone
import html
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.request

from .android import Android, PACKAGE
from .ui import NavigationError

ROOT = Path(__file__).resolve().parents[2]
MAP_PATH = Path(__file__).with_name("map.json")


def load_map():
    return json.loads(MAP_PATH.read_text())


def probe(url):
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            return response.status == 200
    except (OSError, urllib.error.URLError):
        return False


class Navigator:
    def __init__(self, android, mapping, output, timeout=20):
        self.android = android
        self.mapping = mapping
        self.output = output
        self.timeout = timeout

    def selector(self, value):
        return self.mapping["controls"].get(value, value)

    def screen(self, name):
        if name not in self.mapping["screens"]:
            raise NavigationError("Tela desconhecida. Consulte map.")
        return self.mapping["screens"][name]

    def inspect(self):
        self.android.require_unlocked()
        return self.android.hierarchy()

    def require_app(self, hierarchy):
        if not any(node.attrs.get("package") == PACKAGE and node.visible for node in hierarchy.nodes):
            raise NavigationError("O Aqualino não está visível. Use launch; câmera e permissões nativas exigem conferência separada.")

    def wait(self, screen=None, selector=None):
        expected = self.screen(screen)["route"] if screen else None
        deadline = time.monotonic() + self.timeout
        last = None
        while time.monotonic() < deadline:
            last = self.inspect()
            if selector and last.matches(self.selector(selector)):
                return last
            if expected and last.screen == expected and not last.modal:
                return last
            if expected and last.screen in {"Welcome", "VerifyEmail", "Onboarding"} and last.screen != expected:
                raise NavigationError(f"A sessão direcionou para {last.screen}. Conclua o acesso antes de abrir {expected}.")
            time.sleep(.25)
        if last:
            artifact = self.capture(last, "timeout")
            raise NavigationError(f"A tela/controle esperado não apareceu. Estado: {last.screen}; modal: {last.modal}. Evidência: {artifact['directory']}")
        raise NavigationError("Não foi possível ler a tela dentro do prazo.")

    def open(self, name):
        destination = self.screen(name)
        self.android.launch(destination["path"])
        return self.wait(screen=name)

    def tap(self, value, expected=None):
        hierarchy = self.inspect()
        self.require_app(hierarchy)
        node = hierarchy.target(self.selector(value))
        if node.attrs.get("package") != PACKAGE:
            raise NavigationError("O seletor aponta para outro aplicativo. Confira a tela antes de continuar.")
        self.android.tap(node)
        return self.wait(screen=expected) if expected else self.inspect()

    def capture(self, hierarchy, label="inspect"):
        label = re.sub(r"[^a-zA-Z0-9_-]", "-", label)[:60]
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        directory = self.output / self.android.serial / f"{stamp}-{label}"
        directory.mkdir(parents=True, mode=0o700)
        (directory / "hierarchy.xml").write_text(hierarchy.redacted_xml())
        summary = {"serial": self.android.serial, **hierarchy.summary()}
        (directory / "screen.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
        self.android.screenshot(directory / "screen.png")
        return {"directory": str(directory), "screenshot": str(directory / "screen.png"), **summary}

    def flow(self, name):
        if name not in self.mapping["flows"]:
            raise NavigationError("Fluxo desconhecido. Consulte map.")
        steps = []
        started = time.monotonic()
        error = None
        for index, step in enumerate(self.mapping["flows"][name]):
            before = time.monotonic()
            try:
                if "open" in step:
                    hierarchy = self.open(step["open"])
                elif "tap" in step:
                    hierarchy = self.tap(step["tap"], step.get("expect"))
                elif "assert" in step:
                    hierarchy = self.wait(selector=step["assert"])
                else:
                    hierarchy = self.wait(screen=step["expect"])
                evidence = self.capture(hierarchy, f"{name}-{index + 1}")
            except NavigationError as cause:
                error = str(cause)
                steps.append({"step": step, "passed": False, "error": error})
                break
            steps.append({"step": step, "seconds": round(time.monotonic() - before, 2),
                          "passed": True, "screen": hierarchy.screen, "directory": evidence["directory"]})
        result = {"flow": name, "passed": error is None, "error": error,
                  "seconds": round(time.monotonic() - started, 2), "steps": steps}
        report = self.output / self.android.serial / f"{name}-latest.json"
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text(json.dumps(result, ensure_ascii=False, indent=2))
        gallery = report.with_suffix(".html")
        cards = []
        for step in steps:
            title = html.escape(json.dumps(step["step"], ensure_ascii=False))
            if step.get("directory"):
                directory = html.escape(Path(step["directory"]).name)
                cards.append(f'<article><h2>{title}</h2><p>{step["seconds"]} s</p>'
                             f'<a href="{directory}/screen.png"><img src="{directory}/screen.png"></a>'
                             f'<p><a href="{directory}/screen.json">Controles</a> · <a href="{directory}/hierarchy.xml">XML</a></p></article>')
            else:
                cards.append(f'<article><h2>{title}</h2><p>{html.escape(step["error"])}</p></article>')
        gallery.write_text('<!doctype html><html lang="pt-BR"><meta charset="utf-8">'
                           '<meta name="viewport" content="width=device-width,initial-scale=1">'
                           '<title>Aqualino · Navegação</title><style>body{background:#0b202c;color:#f1f7f6;font:16px system-ui;padding:24px}'
                           'main{display:flex;flex-wrap:wrap;gap:20px}article{background:#142f3c;padding:16px;border-radius:16px;width:280px}'
                           'h2{font-size:14px}img{width:100%;border-radius:8px}a{color:#91c8d1}</style>'
                           f'<h1>{html.escape(name)} · {"Concluído" if error is None else "Interrompido"}</h1>'
                           f'<p>{result["seconds"]} segundos</p><main>{"".join(cards)}</main></html>')
        return {**result, "report": str(report), "gallery": str(gallery)}


def parser():
    result = argparse.ArgumentParser(description="Navegação nativa do Aqualino (Android + ADB, sem instalar pacotes Python).")
    result.add_argument("--serial", help="Android específico; também aceita ANDROID_SERIAL")
    result.add_argument("--adb", help="Caminho do Android Debug Bridge")
    result.add_argument("--output", type=Path, default=ROOT / ".artifacts/mobile-nav")
    result.add_argument("--timeout", type=float, default=20, help="Prazo para verificar uma tela/controle")
    commands = result.add_subparsers(dest="command", required=True)
    commands.add_parser("map", help="Mapa de telas, controles, painéis e fluxos em JSON")
    commands.add_parser("doctor", help="Conexão, instalação, bloqueio, Metro e API")
    commands.add_parser("connect", help="Encaminha 8080/8081 do Android para API/Metro locais")
    commands.add_parser("launch", help="Abre o app preservando a sessão")
    commands.add_parser("inspect", help="Tela atual e controles visíveis; salva PNG, XML e JSON")
    commands.add_parser("screenshot", help="Captura e inspeciona a tela atual")
    commands.add_parser("back", help="Volta ou fecha um modal sem confirmar")
    opening = commands.add_parser("open", help="Abre uma tela por deep link e verifica o destino")
    opening.add_argument("screen")
    tap = commands.add_parser("tap", help="Toca em alias/id/label/text atuais, sem coordenadas fixas")
    tap.add_argument("selector")
    tap.add_argument("--expect", help="Verifica a tela após o toque")
    filling = commands.add_parser("fill", help="Substitui texto de um campo; credenciais entram por variável de ambiente")
    filling.add_argument("selector")
    filling.add_argument("--env", required=True, help="Nome da variável de ambiente com o valor")
    waiting = commands.add_parser("wait", help="Aguarda um seletor aparecer")
    waiting.add_argument("selector")
    scrolling = commands.add_parser("scroll", help="Rola dentro de um ScrollView visível")
    scrolling.add_argument("direction", choices=("up", "down"))
    scrolling.add_argument("--within", help="Alias/seletor de uma área rolável específica")
    flows = commands.add_parser("run", help="Executa um fluxo do mapa e gera relatório por etapa")
    flows.add_argument("flow", choices=tuple(load_map()["flows"]))
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        mapping = load_map()
        if args.command == "map":
            print(json.dumps(mapping, ensure_ascii=False, indent=2))
            return 0
        android = Android(args.serial, args.adb)
        nav = Navigator(android, mapping, args.output.resolve(), args.timeout)
        if args.command == "doctor":
            result = {**android.doctor(), "metro": probe("http://127.0.0.1:8081/status"),
                      "api": probe("http://127.0.0.1:8080/api/v1/health")}
        elif args.command == "connect":
            android.connect()
            result = {"serial": android.serial, "forwarded_ports": [8080, 8081]}
        elif args.command == "run":
            result = nav.flow(args.flow)
        else:
            hierarchy = None
            if args.command == "launch":
                android.launch()
            elif args.command == "open":
                hierarchy = nav.open(args.screen)
            elif args.command == "tap":
                hierarchy = nav.tap(args.selector, args.expect)
            elif args.command == "wait":
                hierarchy = nav.wait(selector=args.selector)
            elif args.command in {"back", "scroll", "fill"}:
                hierarchy = nav.inspect()
                nav.require_app(hierarchy)
                if args.command == "back":
                    android.back()
                elif args.command == "scroll":
                    android.scroll(hierarchy, args.direction, nav.selector(args.within) if args.within else None)
                else:
                    if args.env not in os.environ:
                        raise NavigationError("A variável indicada por --env não está definida.")
                    node = hierarchy.target(nav.selector(args.selector), editable=True)
                    if node.attrs.get("package") != PACKAGE:
                        raise NavigationError("O campo não pertence ao Aqualino.")
                    android.fill(node, os.environ[args.env])
                hierarchy = None
            hierarchy = hierarchy or nav.inspect()
            result = nav.capture(hierarchy, args.command)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result.get("passed", True) else 1
    except NavigationError as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
