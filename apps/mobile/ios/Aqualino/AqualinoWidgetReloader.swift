import WidgetKit

@objc final class AqualinoWidgetReloader: NSObject {
  @objc static func reload() {
    WidgetCenter.shared.reloadTimelines(ofKind: "AqualinoWidget")
  }
}

