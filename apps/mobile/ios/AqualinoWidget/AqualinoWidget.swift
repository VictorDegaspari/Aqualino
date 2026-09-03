import SwiftUI
import WidgetKit

private let appGroup = "group.br.com.aqualino.shared"
private let snapshotKey = "snapshot_json"

struct WidgetSnapshot: Codable {
  let schemaVersion: Int
  let generatedAt: Date
  let lastLogAt: Date?
  let daysSinceLastLog: Int?
  let todayTotalMl: Int
  let dailyGoalMl: Int
  let condition: String
  let staticAsset: String

  enum CodingKeys: String, CodingKey {
    case schemaVersion = "schema_version"
    case generatedAt = "generated_at"
    case lastLogAt = "last_log_at"
    case daysSinceLastLog = "days_since_last_log"
    case todayTotalMl = "today_total_ml"
    case dailyGoalMl = "daily_goal_ml"
    case condition
    case staticAsset = "static_asset"
  }

  static let empty = WidgetSnapshot(
    schemaVersion: 1,
    generatedAt: .distantPast,
    lastLogAt: nil,
    daysSinceLastLog: nil,
    todayTotalMl: 0,
    dailyGoalMl: 0,
    condition: "empty",
    staticAsset: "aqualino_empty"
  )
}

struct AqualinoEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot
}

struct AqualinoProvider: TimelineProvider {
  func placeholder(in context: Context) -> AqualinoEntry {
    AqualinoEntry(date: Date(), snapshot: .empty)
  }

  func getSnapshot(in context: Context, completion: @escaping (AqualinoEntry) -> Void) {
    completion(AqualinoEntry(date: Date(), snapshot: loadSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<AqualinoEntry>) -> Void) {
    let entry = AqualinoEntry(date: Date(), snapshot: loadSnapshot())
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(1_800))))
  }

  private func loadSnapshot() -> WidgetSnapshot {
    guard
      let raw = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey),
      let data = raw.data(using: .utf8)
    else { return .empty }

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    guard let snapshot = try? decoder.decode(WidgetSnapshot.self, from: data), snapshot.schemaVersion == 1
    else { return .empty }
    return snapshot
  }
}

struct AqualinoWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: AqualinoEntry

  private var temporalText: String {
    switch entry.snapshot.daysSinceLastLog {
    case nil: return "Ainda não há registros"
    case 0: return "Bebeu água hoje"
    case 1: return "Último registro há 1 dia"
    case let days?: return "Há \(days) dias sem registrar"
    }
  }

  private var mascotFallback: String {
    switch entry.snapshot.condition {
    case "angry": return "💢"
    case "boiling": return "♨️"
    case "skeleton": return "🩻"
    default: return "💧"
    }
  }

  var body: some View {
    Link(destination: URL(string: "aqualino://hydrate/quick?source=widget")!) {
      HStack(spacing: 12) {
        VStack(spacing: 6) {
          if UIImage(named: entry.snapshot.staticAsset) != nil {
            Image(entry.snapshot.staticAsset).resizable().scaledToFit()
          } else {
            Text(mascotFallback).font(.system(size: 42))
          }
          Text(temporalText).font(.caption).multilineTextAlignment(.center)
        }
        if family == .systemMedium {
          VStack(alignment: .leading, spacing: 8) {
            Text("\(entry.snapshot.todayTotalMl) / \(entry.snapshot.dailyGoalMl) ml")
              .font(.headline)
            Text("Bebi água").font(.subheadline).bold().foregroundStyle(.white)
              .padding(.horizontal, 12).padding(.vertical, 8)
              .background(Color(red: 0.031, green: 0.494, blue: 0.545), in: Capsule())
          }
        }
      }
      .containerBackground(Color(red: 0.957, green: 0.984, blue: 0.988), for: .widget)
    }
  }
}

@main
struct AqualinoWidget: Widget {
  let kind = "AqualinoWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: AqualinoProvider()) { entry in
      AqualinoWidgetView(entry: entry)
    }
    .configurationDisplayName("Aqualino")
    .description("Veja sua hidratação e registre rapidamente.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

