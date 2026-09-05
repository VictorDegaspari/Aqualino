import json
from pathlib import Path
import shlex
import tempfile
import unittest
from unittest.mock import Mock

from scripts.mobile_automation.android import Android
from scripts.mobile_automation.cli import Navigator, ROOT, load_map
from scripts.mobile_automation.ui import Hierarchy, NavigationError


def hierarchy(children, screen="Home"):
    return Hierarchy(f'''<?xml version="1.0"?><hierarchy><node resource-id="screen-{screen}"
        package="com.aqualino" bounds="[0,0][360,800]" enabled="true">{children}</node></hierarchy>''')


class SelectorTests(unittest.TestCase):
    def test_text_resolves_to_clickable_parent_without_fixed_coordinates(self):
        view = hierarchy('''<node resource-id="com.aqualino:id/nav-profile" clickable="true"
            bounds="[280,720][350,780]" enabled="true"><node text="Perfil" bounds="[290,730][340,750]"/></node>''')
        self.assertEqual(view.screen, "Home")
        self.assertIs(view.target("text=Perfil"), view.target("id=nav-profile"))
        self.assertEqual(view.target("text=Perfil").bounds, (280, 720, 350, 780))

    def test_ambiguous_and_disabled_controls_are_not_tapped(self):
        view = hierarchy('''<node text="Salvar" clickable="true" bounds="[0,10][80,50]"/>
            <node text="Salvar" clickable="true" bounds="[90,10][160,50]"/>
            <node resource-id="disabled" clickable="true" enabled="false" bounds="[0,60][80,90]"/>''')
        with self.assertRaisesRegex(NavigationError, "ambíguo"):
            view.target("text=Salvar")
        with self.assertRaisesRegex(NavigationError, "desabilitado"):
            view.target("id=disabled")

    def test_hidden_nodes_are_not_targets_and_active_tab_is_a_noop(self):
        view = hierarchy('''<node resource-id="hidden" clickable="true" bounds="[0,0][0,0]"/>
            <node resource-id="nav-home" clickable="false" selected="true" enabled="false" bounds="[0,700][80,780]"/>''')
        self.assertEqual(view.matches("id=hidden"), [])
        android = Android.__new__(Android)
        android.shell = Mock()
        android.tap(view.target("id=nav-home"))
        android.shell.assert_not_called()

    def test_password_is_redacted_from_reports_and_xml(self):
        view = hierarchy('''<node class="android.widget.EditText" resource-id="login-password"
            password="true" text="super-secret" bounds="[10,10][200,60]"/>''')
        self.assertNotIn("super-secret", json.dumps(view.summary()))
        self.assertNotIn("super-secret", view.redacted_xml())
        self.assertEqual(view.matches("text=super-secret"), [])
        self.assertEqual(view.target("id=login-password", editable=True).attrs["text"], "super-secret")

    def test_modal_and_invalid_dump_are_identified(self):
        self.assertTrue(hierarchy('<node resource-id="app-modal" bounds="[0,0][360,800]"/>').modal)
        with self.assertRaises(NavigationError):
            Hierarchy("ERROR: could not get idle state")


class AndroidTests(unittest.TestCase):
    def test_shell_escapes_remote_arguments_including_secrets(self):
        android = Android.__new__(Android)
        android.command = Mock(return_value="")
        value = 'password with $(echo nope) `echo nope` & "quote"'
        android.shell("input", "text", value, sensitive=True)
        args = android.command.call_args
        self.assertEqual(shlex.split(args.args[1]), ["input", "text", value])
        self.assertTrue(args.kwargs["sensitive"])

    def test_launch_uses_main_activity_and_preserves_data(self):
        android = Android.__new__(Android)
        android.require_unlocked = Mock()
        android.shell = Mock(return_value="Status: ok")
        android.launch("history")
        command = android.shell.call_args.args
        self.assertIn("com.aqualino/.MainActivity", command)
        self.assertIn("aqualino://history", command)
        self.assertNotIn("-S", command)
        self.assertNotIn("clear", command)

    def test_locked_device_does_not_launch_or_attempt_to_unlock(self):
        android = Android.__new__(Android)
        android.shell = Mock(return_value="KeyguardServiceDelegate\n showing=true\n secure=true")
        with self.assertRaisesRegex(NavigationError, "bloqueado"):
            android.launch("home")
        android.shell.assert_called_once_with("dumpsys", "window", "policy")

    def test_fill_clears_existing_characters_and_does_not_submit(self):
        android = Android.__new__(Android)
        android.tap = Mock()
        android.shell = Mock()
        node = hierarchy('<node class="android.widget.EditText" text="old" bounds="[0,0][100,50]"/>').nodes[1]
        android.fill(node, "new value")
        android.shell.assert_any_call("input", "keyevent", *(["KEYCODE_DEL"] * 4))
        android.shell.assert_called_with("input", "text", "new%svalue", sensitive=True)
        self.assertNotIn("KEYCODE_ENTER", str(android.shell.call_args_list))


class NavigatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.android = Mock(serial="test-device")
        self.nav = Navigator(self.android, load_map(), Path(self.temp.name), timeout=.01)

    def test_navigation_checks_target_and_stops_at_authentication_guard(self):
        self.android.hierarchy.return_value = hierarchy("", "Welcome")
        with self.assertRaisesRegex(NavigationError, "Conclua o acesso"):
            self.nav.open("profile")
        self.android.launch.assert_called_once_with("profile")

    def test_tap_waits_for_destination(self):
        self.android.hierarchy.side_effect = [hierarchy('''<node resource-id="nav-profile"
            package="com.aqualino" clickable="true" bounds="[280,720][350,780]"/>'''), hierarchy("", "Profile")]
        result = self.nav.tap("nav.profile", expected="profile")
        self.assertEqual(result.screen, "Profile")
        self.android.tap.assert_called_once()

    def test_failed_flow_is_reported_as_failed_and_stops(self):
        self.nav.open = Mock(side_effect=NavigationError("Android bloqueado"))
        result = self.nav.flow("tour")
        self.assertFalse(result["passed"])
        self.assertEqual(len(result["steps"]), 1)
        self.assertFalse(json.loads(Path(result["report"]).read_text())["passed"])
        self.assertTrue(Path(result["gallery"]).is_file())

    def test_artifacts_use_unique_directories_and_hide_passwords(self):
        view = hierarchy('<node password="true" text="secret" bounds="[0,0][100,50]"/>')
        first = self.nav.capture(view)
        second = self.nav.capture(view)
        self.assertNotEqual(first["directory"], second["directory"])
        self.assertNotIn("secret", (Path(first["directory"]) / "hierarchy.xml").read_text())

    def test_map_covers_registered_routes_and_matches_deep_links(self):
        import re
        mapping = load_map()
        app = (ROOT / "apps/mobile/src/app/navigation/AppNavigation.tsx").read_text()
        linking = (ROOT / "apps/mobile/src/app/navigation/linking.ts").read_text()
        registered = set(re.findall(r"\n  (\w+):", app.split("const Stack")[0]))
        self.assertEqual(registered, {screen["route"] for screen in mapping["screens"].values()})
        for screen in mapping["screens"].values():
            self.assertIn(f"{screen['route']}: '{screen['path']}'", linking)
        for steps in mapping["flows"].values():
            for step in steps:
                if "open" in step:
                    self.assertIn(step["open"], mapping["screens"])
                if "tap" in step:
                    self.assertIn(step["tap"], mapping["controls"])


if __name__ == "__main__":
    unittest.main()
