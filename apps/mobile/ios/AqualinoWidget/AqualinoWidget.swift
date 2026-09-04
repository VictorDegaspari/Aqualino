import SwiftUI
import UIKit
import WidgetKit

private let appGroup = "group.br.com.aqualino.shared"
private let snapshotKey = "snapshot_json"
private let schemaVersion = 2

private let variationInterval: TimeInterval = 3 * 60 * 60

private struct WidgetPalette {
  let background: Color
  let heading: Color
  let copy: Color
  let pending: Color
  let completed: Color
}

private struct WidgetPresentation {
  let phrase: String
  let mascotAsset: String
  let palette: WidgetPalette
}

struct WidgetSnapshot: Codable {
  let schemaVersion: Int
  let generatedAt: Date
  let lastLogAt: Date?
  let daysSinceLastLog: Int?
  let currentStreak: Int
  let todayTotalMl: Int
  let dailyGoalMl: Int
  let userTimezone: String
  let condition: String
  let staticAsset: String
  let isAuthenticated: Bool?

  enum CodingKeys: String, CodingKey {
    case schemaVersion = "schema_version"
    case generatedAt = "generated_at"
    case lastLogAt = "last_log_at"
    case daysSinceLastLog = "days_since_last_log"
    case currentStreak = "current_streak"
    case todayTotalMl = "today_total_ml"
    case dailyGoalMl = "daily_goal_ml"
    case userTimezone = "user_timezone"
    case condition
    case staticAsset = "static_asset"
    case isAuthenticated = "is_authenticated"
  }

  static let empty = WidgetSnapshot(
    schemaVersion: schemaVersion,
    generatedAt: .distantPast,
    lastLogAt: nil,
    daysSinceLastLog: nil,
    currentStreak: 0,
    todayTotalMl: 0,
    dailyGoalMl: 2_000,
    userTimezone: TimeZone.current.identifier,
    condition: "angry",
    staticAsset: "aqualino_sad",
    isAuthenticated: false
  )

  static let preview = WidgetSnapshot(
    schemaVersion: schemaVersion,
    generatedAt: Date(),
    lastLogAt: Date(),
    daysSinceLastLog: 0,
    currentStreak: 2,
    todayTotalMl: 1_400,
    dailyGoalMl: 2_000,
    userTimezone: TimeZone.current.identifier,
    condition: "happy",
    staticAsset: "aqualino_happy_active",
    isAuthenticated: true
  )

}

struct AqualinoEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot
}

struct AqualinoProvider: TimelineProvider {
  func placeholder(in context: Context) -> AqualinoEntry {
    AqualinoEntry(date: Date(), snapshot: .preview)
  }

  func getSnapshot(in context: Context, completion: @escaping (AqualinoEntry) -> Void) {
    let snapshot = context.isPreview ? WidgetSnapshot.preview : loadSnapshot()
    completion(AqualinoEntry(date: Date(), snapshot: snapshot))
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
    guard
      let snapshot = try? decoder.decode(WidgetSnapshot.self, from: data),
      snapshot.schemaVersion == schemaVersion
    else { return .empty }
    return snapshot
  }
}

private struct WidgetDay: Identifiable {
  let id: Int
  let label: String
  let completed: Bool
}

private struct WidgetDayRun: Identifiable {
  let id: Int
  let days: [WidgetDay]
  let completed: Bool
}

struct AqualinoWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: AqualinoEntry

  private var presentation: WidgetPresentation {
    widgetPresentation(for: entry.snapshot, at: entry.date)
  }

  private var isDisconnected: Bool {
    entry.snapshot.isAuthenticated == false
  }

  var body: some View {
    if #available(iOSApplicationExtension 17.0, *) {
      widgetContent
        .containerBackground(for: .widget) { widgetBackground }
        .clipShape(ContainerRelativeShape())
    } else {
      widgetContent
        .background(widgetBackground)
        .clipShape(ContainerRelativeShape())
    }
  }

  @ViewBuilder
  private var widgetBackground: some View {
    if isDisconnected {
      ZStack {
        LinearGradient(
          colors: [color(0x070B25), color(0x34205F), color(0x79206F)],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
        RadialGradient(
          colors: [color(0x8B4BCA).opacity(0.5), Color.clear],
          center: .topTrailing,
          startRadius: 0,
          endRadius: 220
        )
      }
    } else {
      presentation.palette.background
    }
  }

  private var widgetContent: some View {
    Link(destination: URL(string: "aqualino://hydrate/quick?source=widget")!) {
      Group {
        if isDisconnected {
          disconnectedContent
        } else if family == .systemSmall {
          compactContent
        } else {
          largeContent
        }
      }
    }
  }

  @ViewBuilder
  private var disconnectedContent: some View {
    if family == .systemSmall {
      VStack(spacing: 2) {
        mascot
          .frame(width: 88, height: 74)
          .accessibilityLabel("Aqualino chorando")
        Text(presentation.phrase)
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(presentation.palette.heading)
          .multilineTextAlignment(.center)
          .lineLimit(3)
          .minimumScaleFactor(0.82)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .padding(8)
    } else {
      HStack(spacing: 10) {
        Text(presentation.phrase)
          .font(.system(size: 20, weight: .bold, design: .rounded))
          .foregroundStyle(presentation.palette.heading)
          .lineLimit(3)
          .minimumScaleFactor(0.8)
          .frame(maxWidth: .infinity, alignment: .leading)

        mascot
          .frame(width: 164, height: 126)
          .accessibilityLabel("Aqualino chorando")
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 10)
    }
  }

  private var largeContent: some View {
    HStack(alignment: .center, spacing: 7) {
      VStack(alignment: .leading, spacing: 0) {
        Spacer(minLength: 8)
        streakTitle(fontSize: 26)
        Text(presentation.phrase)
          .font(.system(size: 14, weight: .regular, design: .rounded))
          .foregroundStyle(presentation.palette.copy)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .padding(.top, 8)

        Spacer(minLength: 12)
        weekStrip(markerSize: 18, spacing: 8, checkSize: 14, labelSize: 10)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)

      mascot
        .frame(width: 172, height: 132)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 10)
  }

  private var compactContent: some View {
    VStack(spacing: 3) {
      streakTitle(fontSize: 23)
      mascot.frame(width: 80, height: 80)
      Text(presentation.phrase)
        .font(.system(size: 11, weight: .medium, design: .rounded))
        .foregroundStyle(presentation.palette.copy)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(8)
  }

  private func streakTitle(fontSize: CGFloat) -> some View {
    HStack(spacing: 7) {
      Image(systemName: "drop.fill")
        .font(.system(size: fontSize - 2, weight: .bold))
      Text(entry.snapshot.currentStreak == 1 ? "1 dia" : "\(entry.snapshot.currentStreak) dias")
        .font(.system(size: fontSize, weight: .bold, design: .rounded))
    }
    .foregroundStyle(presentation.palette.heading)
  }

  private var mascot: some View {
    Group {
      if let image = UIImage(named: presentation.mascotAsset, in: .main, compatibleWith: nil) {
        Image(uiImage: image)
          .resizable()
          .scaledToFit()
      } else {
        Text("💧").font(.system(size: 58))
      }
    }
    .accessibilityLabel("Aqualino")
  }

  private func weekStrip(
    markerSize: CGFloat,
    spacing: CGFloat,
    checkSize: CGFloat,
    labelSize: CGFloat
  ) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      HStack(spacing: spacing) {
        ForEach(visibleDays) { day in
          Text(day.label)
            .font(.system(size: labelSize, weight: .bold, design: .rounded))
            .foregroundStyle(presentation.palette.heading)
            .frame(width: markerSize)
        }
      }

      HStack(spacing: spacing) {
        ForEach(dayRuns) { run in
          if run.completed {
            HStack(spacing: spacing) {
              ForEach(run.days) { _ in
                Image(systemName: "checkmark")
                  .font(.system(size: checkSize, weight: .black))
                  .foregroundStyle(presentation.palette.heading)
                  .frame(width: markerSize, height: markerSize)
              }
            }
            .frame(
              width: markerSize * CGFloat(run.days.count) + spacing * CGFloat(run.days.count - 1),
              height: markerSize
            )
            .background(presentation.palette.completed, in: Capsule())
          } else if let day = run.days.first {
            Circle()
              .fill(day.completed ? presentation.palette.completed : presentation.palette.pending)
              .frame(width: markerSize, height: markerSize)
          }
        }
      }
    }
  }

  private var dayRuns: [WidgetDayRun] {
    var runs: [WidgetDayRun] = []
    var index = 0

    while index < visibleDays.count {
      let day = visibleDays[index]
      if day.completed {
        let start = index
        while index < visibleDays.count && visibleDays[index].completed {
          index += 1
        }
        runs.append(WidgetDayRun(id: start, days: Array(visibleDays[start..<index]), completed: true))
      } else {
        runs.append(WidgetDayRun(id: index, days: [day], completed: false))
        index += 1
      }
    }

    return runs
  }

  private var visibleDays: [WidgetDay] {
    let initials = ["D", "S", "T", "Q", "Q", "S", "S"]
    let todayHasWater = entry.snapshot.todayTotalMl >= 50
    let firstCompletedDaysAgo = todayHasWater ? 0 : 1
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: entry.snapshot.userTimezone) ?? .current
    let todayIndex = calendar.component(.weekday, from: entry.date) - 1

    return (0..<5).map { index in
      let daysAgo = 4 - index
      let dayIndex = (todayIndex - daysAgo + initials.count) % initials.count
      let completed = daysAgo >= 0
        && entry.snapshot.currentStreak > 0
        && daysAgo >= firstCompletedDaysAgo
        && daysAgo < firstCompletedDaysAgo + entry.snapshot.currentStreak
      return WidgetDay(
        id: index,
        label: initials[dayIndex],
        completed: completed
      )
    }
  }
}

private func widgetPresentation(for snapshot: WidgetSnapshot, at date: Date) -> WidgetPresentation {
  if snapshot.isAuthenticated == false {
    return WidgetPresentation(
      phrase: "Você está desconectado da conta",
      mascotAsset: "aqualino_sad",
      palette: disconnectedSpace
    )
  }

  let variation = Int(date.timeIntervalSince1970 / variationInterval) % 3
  let phrases: [String]
  let palettes: [WidgetPalette]

  switch snapshot.condition {
  case "happy":
    phrases = ["Você está mandando bem!", "Cada gole conta!", "Continue nesse ritmo!"]
    palettes = [happyBlue, happyTeal, happyPurple]
  case "angry":
    phrases = ["Estou com saudade da água!", "Um gole muda meu humor.", "Vamos voltar ao ritmo?"]
    palettes = [sadNavy, sadPurple, sadBlue]
  case "boiling":
    phrases = ["Hora de refrescar!", "Aqualino precisa de água!", "Bora recuperar essa força?"]
    palettes = [strongOrange, strongPurple, strongPink]
  case "skeleton":
    phrases = ["Uma gota pode me salvar!", "Ainda dá tempo de voltar!", "Estou esperando por você."]
    palettes = [sadNavy, sadBlue, sadPurple]
  default:
    phrases = ["Vamos beber água?", "Sua primeira gota te espera!", "Quanto antes, melhor!"]
    palettes = [happyTeal, happyBlue, happyPurple]
  }

  let mascotAsset: String
  switch snapshot.condition {
  case "angry", "skeleton":
    mascotAsset = "aqualino_sad"
  case "boiling":
    mascotAsset = variation == 1 ? "aqualino_sad" : "aqualino_strong"
  case "happy":
    mascotAsset = snapshot.todayTotalMl >= snapshot.dailyGoalMl || variation == 2
      ? "aqualino_strong"
      : "aqualino_happy_active"
  default:
    mascotAsset = "aqualino_happy_active"
  }

  return WidgetPresentation(
    phrase: phrases[variation],
    mascotAsset: mascotAsset,
    palette: palettes[variation]
  )
}

private func color(_ hex: UInt32) -> Color {
  Color(
    red: Double((hex >> 16) & 0xFF) / 255,
    green: Double((hex >> 8) & 0xFF) / 255,
    blue: Double(hex & 0xFF) / 255
  )
}

private let happyBlue = WidgetPalette(background: color(0x087FC7), heading: color(0xF2FBFF), copy: color(0xD9F5FF), pending: color(0x075C92), completed: color(0x50CFF4))
private let happyTeal = WidgetPalette(background: color(0x087E8B), heading: color(0xF0FFFF), copy: color(0xD4FAF6), pending: color(0x075B64), completed: color(0x5BDED2))
private let happyPurple = WidgetPalette(background: color(0x6552C7), heading: color(0xFFF3FF), copy: color(0xF1E4FF), pending: color(0x49399A), completed: color(0xB996FF))
private let sadNavy = WidgetPalette(background: color(0x2B3C6B), heading: color(0xF1F5FF), copy: color(0xD8E2FF), pending: color(0x1E2B50), completed: color(0x7189C7))
private let sadPurple = WidgetPalette(background: color(0x59457E), heading: color(0xFFF3FF), copy: color(0xE9DDF5), pending: color(0x40305E), completed: color(0xAA8AC8))
private let sadBlue = WidgetPalette(background: color(0x345A7D), heading: color(0xF2FBFF), copy: color(0xD8EAF6), pending: color(0x24415D), completed: color(0x75A8C9))
private let strongOrange = WidgetPalette(background: color(0xE5683A), heading: color(0xFFF8EE), copy: color(0xFFE8D5), pending: color(0xA84426), completed: color(0xFFB26F))
private let strongPurple = WidgetPalette(background: color(0x7445B8), heading: color(0xFFF5FF), copy: color(0xF2DEFF), pending: color(0x523083), completed: color(0xC18AF1))
private let strongPink = WidgetPalette(background: color(0xD81B90), heading: color(0xFFE4F3), copy: color(0xFFD3EA), pending: color(0xA8146C), completed: color(0xEF77BE))
private let disconnectedSpace = WidgetPalette(background: color(0x090D2E), heading: color(0xF8F1FF), copy: color(0xEBDFFF), pending: color(0x26204F), completed: color(0x9D65D8))

@main
struct AqualinoWidget: Widget {
  let kind = "AqualinoWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: AqualinoProvider()) { entry in
      AqualinoWidgetView(entry: entry)
    }
    .configurationDisplayName("Aqualino")
    .description("Acompanhe sua sequência e registre água rapidamente.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
