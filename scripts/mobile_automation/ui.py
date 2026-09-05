"""Native hierarchy selectors shared by the CLI and its offline tests."""

from dataclasses import dataclass
import re
import xml.etree.ElementTree as ET


class NavigationError(Exception):
    pass


def resource_name(value):
    return value.rsplit(":id/", 1)[-1]


@dataclass
class Node:
    attrs: dict
    parent: "Node | None" = None

    @property
    def bounds(self):
        match = re.fullmatch(r"\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]", self.attrs.get("bounds", ""))
        return tuple(map(int, match.groups())) if match else (0, 0, 0, 0)

    @property
    def visible(self):
        x1, y1, x2, y2 = self.bounds
        return x2 > x1 and y2 > y1 and self.attrs.get("visible-to-user") != "false"

    @property
    def enabled(self):
        return self.attrs.get("enabled") != "false" and (self.parent is None or self.parent.enabled)

    def summary(self):
        return {
            "id": resource_name(self.attrs.get("resource-id", "")),
            "text": "[protegido]" if self.attrs.get("password") == "true" else self.attrs.get("text", ""),
            "label": self.attrs.get("content-desc", ""),
            "class": self.attrs.get("class", "").rsplit(".", 1)[-1],
            "bounds": self.bounds,
            "enabled": self.enabled,
            "selected": self.attrs.get("selected") == "true",
            "clickable": self.attrs.get("clickable") == "true",
            "scrollable": self.attrs.get("scrollable") == "true",
        }


class Hierarchy:
    def __init__(self, xml):
        start = xml.find("<hierarchy")
        end = xml.rfind("</hierarchy>")
        if start < 0 or end < 0:
            raise NavigationError("O Android não retornou a árvore da tela. Confira se o app está visível.")
        try:
            self.root = ET.fromstring(xml[start:end + len("</hierarchy>")])
        except ET.ParseError as error:
            raise NavigationError("A árvore da tela está incompleta. Execute inspect novamente.") from error
        self.nodes = []

        def visit(element, parent=None):
            node = Node(dict(element.attrib), parent) if element.tag == "node" else parent
            if element.tag == "node":
                self.nodes.append(node)
            for child in element:
                visit(child, node)

        visit(self.root)

    def matches(self, selector):
        kind, separator, value = selector.partition("=")
        if not separator or kind not in {"id", "label", "text", "contains"} or not value:
            raise NavigationError("Use um alias do mapa ou id=…, label=…, text=…, contains=….")

        def matches(node):
            attrs = node.attrs
            if kind == "id":
                return resource_name(attrs.get("resource-id", "")) == value
            if kind == "label":
                return attrs.get("content-desc") == value
            if attrs.get("password") == "true":
                return False
            if kind == "text":
                return attrs.get("text") == value
            return value in attrs.get("text", "") or value in attrs.get("content-desc", "")

        return [node for node in self.nodes if node.visible and matches(node)]

    def target(self, selector, editable=False):
        candidates = []
        for node in self.matches(selector):
            target = node
            if editable:
                if not target.attrs.get("class", "").endswith("EditText"):
                    continue
            else:
                while target and target.attrs.get("clickable") != "true" and target.attrs.get("selected") != "true":
                    target = target.parent
            if target and target.visible and all(target is not other for other in candidates):
                candidates.append(target)
        if not candidates:
            raise NavigationError("Controle não encontrado ou fora da área visível. Use inspect ou scroll.")
        if len(candidates) != 1:
            raise NavigationError("Seletor ambíguo: há mais de um controle. Prefira um id ou label exato.")
        target = candidates[0]
        if not target.enabled and target.attrs.get("selected") != "true":
            raise NavigationError("O controle está desabilitado. Confira os requisitos da tela.")
        return target

    @property
    def screen(self):
        for node in self.nodes:
            name = resource_name(node.attrs.get("resource-id", ""))
            if node.visible and name.startswith("screen-"):
                return name.removeprefix("screen-")
        return None

    @property
    def modal(self):
        return bool(self.matches("id=app-modal"))

    def summary(self):
        controls = [node.summary() for node in self.nodes if node.visible and (
            node.attrs.get("text") or node.attrs.get("content-desc") or node.attrs.get("resource-id")
            or node.attrs.get("clickable") == "true" or node.attrs.get("scrollable") == "true"
        )]
        return {"screen": self.screen, "modal": self.modal, "elements": controls}

    def redacted_xml(self):
        for element in self.root.iter("node"):
            if element.attrib.get("password") == "true":
                element.set("text", "[protegido]")
        return ET.tostring(self.root, encoding="unicode")
