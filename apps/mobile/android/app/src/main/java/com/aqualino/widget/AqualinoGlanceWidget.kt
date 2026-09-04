package com.aqualino.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.ColorFilter
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.ContentScale
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import java.util.Calendar
import java.util.TimeZone
import org.json.JSONObject

data class AqualinoWidgetSnapshot(
  val totalMl: Int = 0,
  val goalMl: Int = 2_000,
  val currentStreak: Int = 0,
  val timezone: String = TimeZone.getDefault().id,
  val condition: String = "empty",
  val isAuthenticated: Boolean = false,
)

private data class WidgetDay(val label: String, val completed: Boolean)
private data class WidgetPalette(
  val background: Color,
  val heading: Color,
  val copy: Color,
  val pending: Color,
  val completed: Color,
)
private data class WidgetPresentation(
  val phrase: String,
  val mascotResId: Int,
  val palette: WidgetPalette,
)

class AqualinoGlanceWidget : GlanceAppWidget() {
  override val sizeMode = SizeMode.Single

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val snapshot = readSnapshot(context)
    val presentation = widgetPresentation(snapshot)
    provideContent { AqualinoWidgetContent(snapshot, presentation, compact = false) }
  }
}

class AqualinoSmallGlanceWidget : GlanceAppWidget() {
  override val sizeMode = SizeMode.Single

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val snapshot = readSnapshot(context)
    val presentation = widgetPresentation(snapshot)
    provideContent { AqualinoWidgetContent(snapshot, presentation, compact = true) }
  }
}

class AqualinoWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = AqualinoGlanceWidget()
}

class AqualinoSmallWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = AqualinoSmallGlanceWidget()
}

@Composable
private fun AqualinoWidgetContent(
  snapshot: AqualinoWidgetSnapshot,
  presentation: WidgetPresentation,
  compact: Boolean,
) {
  val deepLink = Intent(Intent.ACTION_VIEW, Uri.parse("aqualino://hydrate/quick?source=widget"))
  var backgroundModifier = GlanceModifier
    .fillMaxSize()
    // Lets the launcher identify this surface as the widget background, so its
    // system corner radius and transition clipping are applied correctly.
    .appWidgetBackground()

  if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
    backgroundModifier = backgroundModifier.cornerRadius(
      android.R.dimen.system_app_widget_background_radius,
    )
  }

  Box(
    modifier = GlanceModifier.fillMaxSize().clickable(actionStartActivity(deepLink)),
    contentAlignment = Alignment.Center,
  ) {
    if (snapshot.isAuthenticated) {
      TintedWidgetShape(
        resId = com.aqualino.R.drawable.aqualino_widget_surface,
        color = presentation.palette.background,
        modifier = backgroundModifier,
      )
    } else {
      Image(
        provider = ImageProvider(com.aqualino.R.drawable.aqualino_widget_disconnected_surface),
        contentDescription = null,
        modifier = backgroundModifier,
        contentScale = ContentScale.FillBounds,
      )
    }
    Box(modifier = GlanceModifier.fillMaxSize()) {
      if (!snapshot.isAuthenticated) {
        DisconnectedWidget(compact, presentation)
      } else if (compact) {
        CompactWidget(snapshot, presentation)
      } else {
        LargeWidget(snapshot, presentation)
      }
    }
  }
}

@Composable
private fun DisconnectedWidget(compact: Boolean, presentation: WidgetPresentation) {
  if (compact) {
    Column(
      modifier = GlanceModifier.fillMaxSize().padding(8.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Image(
        provider = ImageProvider(presentation.mascotResId),
        contentDescription = "Aqualino chorando",
        modifier = GlanceModifier.width(82.dp).height(68.dp),
        contentScale = ContentScale.Fit,
      )
      Text(
        text = presentation.phrase,
        style = TextStyle(
          color = ColorProvider(presentation.palette.heading),
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold,
        ),
        maxLines = 3,
      )
    }
  } else {
    Row(
      modifier = GlanceModifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 9.dp),
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Text(
        text = presentation.phrase,
        modifier = GlanceModifier.defaultWeight(),
        style = TextStyle(
          color = ColorProvider(presentation.palette.heading),
          fontSize = 18.sp,
          fontWeight = FontWeight.Bold,
        ),
        maxLines = 3,
      )
      Spacer(modifier = GlanceModifier.width(8.dp))
      Image(
        provider = ImageProvider(presentation.mascotResId),
        contentDescription = "Aqualino chorando",
        modifier = GlanceModifier.width(128.dp).height(104.dp),
        contentScale = ContentScale.Fit,
      )
    }
  }
}

@Composable
private fun TintedWidgetShape(
  resId: Int,
  color: Color,
  modifier: GlanceModifier,
) {
  Image(
    provider = ImageProvider(resId),
    contentDescription = null,
    modifier = modifier,
    contentScale = ContentScale.FillBounds,
    colorFilter = ColorFilter.tint(ColorProvider(color)),
  )
}

@Composable
private fun LargeWidget(
  snapshot: AqualinoWidgetSnapshot,
  presentation: WidgetPresentation,
) {
  Row(
    modifier = GlanceModifier.fillMaxSize().padding(horizontal = 10.dp, vertical = 6.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Column(
      modifier = GlanceModifier.fillMaxSize().defaultWeight(),
      horizontalAlignment = Alignment.Start,
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Spacer(modifier = GlanceModifier.height(7.dp))
      StreakTitle(snapshot.currentStreak, 22, presentation.palette)
      Spacer(modifier = GlanceModifier.height(6.dp))
      Text(
        text = presentation.phrase,
        style = TextStyle(color = ColorProvider(presentation.palette.copy), fontSize = 12.sp),
        maxLines = 1,
      )
      Spacer(modifier = GlanceModifier.defaultWeight())
      WeekStrip(snapshot, presentation.palette, markerSize = 16, gap = 7, checkSize = 12, labelSize = 9)
    }
    Spacer(modifier = GlanceModifier.width(5.dp))
    Image(
      provider = ImageProvider(presentation.mascotResId),
      contentDescription = "Aqualino",
      modifier = GlanceModifier.width(116.dp).height(98.dp),
      contentScale = ContentScale.Fit,
    )
  }
}

@Composable
private fun CompactWidget(
  snapshot: AqualinoWidgetSnapshot,
  presentation: WidgetPresentation,
) {
  Column(
    modifier = GlanceModifier.fillMaxSize().padding(4.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalAlignment = Alignment.CenterVertically,
  ) {
    StreakTitle(snapshot.currentStreak, 22, presentation.palette)
    Spacer(modifier = GlanceModifier.height(2.dp))
    Image(
      provider = ImageProvider(presentation.mascotResId),
      contentDescription = "Aqualino",
      modifier = GlanceModifier.width(80.dp).height(62.dp),
      contentScale = ContentScale.Fit,
    )
    Text(
      text = presentation.phrase,
      style = TextStyle(color = ColorProvider(presentation.palette.copy), fontSize = 11.sp),
    )
  }
}

@Composable
private fun StreakTitle(streak: Int, fontSize: Int, palette: WidgetPalette) {
  Row(verticalAlignment = Alignment.CenterVertically) {
    Image(
      provider = ImageProvider(com.aqualino.R.drawable.aqualino_widget_drop),
      contentDescription = null,
      modifier = GlanceModifier.size((fontSize - 1).dp),
    )
    Spacer(modifier = GlanceModifier.width(7.dp))
    Text(
      text = if (streak == 1) "1 dia" else "$streak dias",
      style = TextStyle(
        color = ColorProvider(palette.heading),
        fontSize = fontSize.sp,
        fontWeight = FontWeight.Bold,
      ),
    )
  }
}

@Composable
private fun WeekStrip(
  snapshot: AqualinoWidgetSnapshot,
  palette: WidgetPalette,
  markerSize: Int,
  gap: Int,
  checkSize: Int,
  labelSize: Int,
) {
  val days = widgetDays(snapshot)
  Column(horizontalAlignment = Alignment.Start) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      days.forEachIndexed { index, day ->
        Text(
          text = day.label,
          modifier = GlanceModifier.width(markerSize.dp),
          style = TextStyle(
            color = ColorProvider(palette.heading),
            fontSize = labelSize.sp,
            fontWeight = FontWeight.Bold,
          ),
        )
        if (index < days.lastIndex) Spacer(modifier = GlanceModifier.width(gap.dp))
      }
    }
    Spacer(modifier = GlanceModifier.height(2.dp))
    Row(verticalAlignment = Alignment.CenterVertically) {
      var index = 0
      while (index < days.size) {
        if (days[index].completed) {
          val runStart = index
          while (index < days.size && days[index].completed) index++
          CompletedDayRun(
            days = days.subList(runStart, index),
            palette = palette,
            markerSize = markerSize,
            gap = gap,
            checkSize = checkSize,
          )
        } else {
          TintedWidgetShape(
            resId = com.aqualino.R.drawable.aqualino_widget_marker,
            color = palette.pending,
            modifier = GlanceModifier.size(markerSize.dp),
          )
          index++
        }

        if (index < days.size) Spacer(modifier = GlanceModifier.width(gap.dp))
      }
    }
  }
}

@Composable
private fun CompletedDayRun(
  days: List<WidgetDay>,
  palette: WidgetPalette,
  markerSize: Int,
  gap: Int,
  checkSize: Int,
) {
  val runWidth = markerSize * days.size + gap * (days.size - 1)
  Box(
    modifier = GlanceModifier.width(runWidth.dp).height(markerSize.dp),
    contentAlignment = Alignment.Center,
  ) {
    TintedWidgetShape(
      resId = com.aqualino.R.drawable.aqualino_widget_pill,
      color = palette.completed,
      modifier = GlanceModifier.fillMaxSize(),
    )
    Row(verticalAlignment = Alignment.CenterVertically) {
      days.forEachIndexed { index, _ ->
        Box(
          modifier = GlanceModifier.size(markerSize.dp),
          contentAlignment = Alignment.Center,
        ) {
          Text(
            text = "✓",
            style = TextStyle(
              color = ColorProvider(palette.heading),
              fontSize = checkSize.sp,
              fontWeight = FontWeight.Bold,
            ),
          )
        }
        if (index < days.lastIndex) Spacer(modifier = GlanceModifier.width(gap.dp))
      }
    }
  }
}

private fun readSnapshot(context: Context): AqualinoWidgetSnapshot {
  val raw = context.getSharedPreferences(AqualinoWidgetModule.PREFERENCES, Context.MODE_PRIVATE)
    .getString(AqualinoWidgetModule.SNAPSHOT_KEY, null) ?: return AqualinoWidgetSnapshot()
  return runCatching {
    val json = JSONObject(raw)
    if (json.optInt("schema_version") != AqualinoWidgetModule.SCHEMA_VERSION) {
      return AqualinoWidgetSnapshot()
    }
    java.time.Instant.parse(json.getString("generated_at"))
    AqualinoWidgetSnapshot(
      totalMl = json.optInt("today_total_ml"),
      goalMl = json.optInt("daily_goal_ml", 2_000),
      currentStreak = json.optInt("current_streak"),
      timezone = json.optString("user_timezone", TimeZone.getDefault().id),
      condition = json.optString("condition", "empty"),
      isAuthenticated = json.optBoolean("is_authenticated", true),
    )
  }.getOrDefault(AqualinoWidgetSnapshot())
}

private fun widgetDays(snapshot: AqualinoWidgetSnapshot): List<WidgetDay> {
  val initials = arrayOf("D", "S", "T", "Q", "Q", "S", "S")
  val todayHasWater = snapshot.totalMl >= 50
  val firstCompletedDaysAgo = if (todayHasWater) 0 else 1
  val calendar = Calendar.getInstance(TimeZone.getTimeZone(snapshot.timezone))
  val todayIndex = calendar.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY

  return (VISIBLE_DAY_COUNT - 1 downTo 0).map { daysAgo ->
    val dayIndex = (todayIndex - daysAgo + initials.size) % initials.size
    val completed = daysAgo >= 0 &&
      snapshot.currentStreak > 0 &&
      daysAgo >= firstCompletedDaysAgo &&
      daysAgo < firstCompletedDaysAgo + snapshot.currentStreak
    WidgetDay(initials[dayIndex], completed)
  }
}

private fun widgetPresentation(snapshot: AqualinoWidgetSnapshot): WidgetPresentation {
  if (!snapshot.isAuthenticated) {
    return WidgetPresentation(
      "Você está desconectado da conta",
      com.aqualino.R.drawable.aqualino_sad,
      DISCONNECTED_SPACE,
    )
  }

  val variation = ((System.currentTimeMillis() / VARIATION_INTERVAL_MS) % 3).toInt()
  val phrases = when (snapshot.condition) {
    "happy" -> listOf("Você está mandando bem!", "Cada gole conta!", "Continue nesse ritmo!")
    "angry" -> listOf("Estou com saudade da água!", "Um gole muda meu humor.", "Vamos voltar ao ritmo?")
    "boiling" -> listOf("Hora de refrescar!", "Aqualino precisa de água!", "Bora recuperar essa força?")
    "skeleton" -> listOf("Uma gota pode me salvar!", "Ainda dá tempo de voltar!", "Estou esperando por você.")
    else -> listOf("Vamos beber água?", "Sua primeira gota te espera!", "Quanto antes, melhor!")
  }
  val palettes = when (snapshot.condition) {
    "happy" -> listOf(HAPPY_BLUE, HAPPY_TEAL, HAPPY_PURPLE)
    "angry" -> listOf(SAD_NAVY, SAD_PURPLE, SAD_BLUE)
    "boiling" -> listOf(STRONG_ORANGE, STRONG_PURPLE, STRONG_PINK)
    "skeleton" -> listOf(SAD_NAVY, SAD_BLUE, SAD_PURPLE)
    else -> listOf(HAPPY_TEAL, HAPPY_BLUE, HAPPY_PURPLE)
  }
  val mascotResId = when (snapshot.condition) {
    "angry", "skeleton" -> com.aqualino.R.drawable.aqualino_sad
    "boiling" -> if (variation == 1) {
      com.aqualino.R.drawable.aqualino_sad
    } else {
      com.aqualino.R.drawable.aqualino_strong
    }
    "happy" -> if (snapshot.totalMl >= snapshot.goalMl || variation == 2) {
      com.aqualino.R.drawable.aqualino_strong
    } else {
      com.aqualino.R.drawable.aqualino_happy_active
    }
    else -> com.aqualino.R.drawable.aqualino_happy_active
  }

  return WidgetPresentation(phrases[variation], mascotResId, palettes[variation])
}

private const val VARIATION_INTERVAL_MS = 3L * 60L * 60L * 1_000L
private const val VISIBLE_DAY_COUNT = 5

private val HAPPY_BLUE = WidgetPalette(Color(0xFF087FC7), Color(0xFFF2FBFF), Color(0xFFD9F5FF), Color(0xFF075C92), Color(0xFF50CFF4))
private val HAPPY_TEAL = WidgetPalette(Color(0xFF087E8B), Color(0xFFF0FFFF), Color(0xFFD4FAF6), Color(0xFF075B64), Color(0xFF5BDED2))
private val HAPPY_PURPLE = WidgetPalette(Color(0xFF6552C7), Color(0xFFFFF3FF), Color(0xFFF1E4FF), Color(0xFF49399A), Color(0xFFB996FF))
private val SAD_NAVY = WidgetPalette(Color(0xFF2B3C6B), Color(0xFFF1F5FF), Color(0xFFD8E2FF), Color(0xFF1E2B50), Color(0xFF7189C7))
private val SAD_PURPLE = WidgetPalette(Color(0xFF59457E), Color(0xFFFFF3FF), Color(0xFFE9DDF5), Color(0xFF40305E), Color(0xFFAA8AC8))
private val SAD_BLUE = WidgetPalette(Color(0xFF345A7D), Color(0xFFF2FBFF), Color(0xFFD8EAF6), Color(0xFF24415D), Color(0xFF75A8C9))
private val STRONG_ORANGE = WidgetPalette(Color(0xFFE5683A), Color(0xFFFFF8EE), Color(0xFFFFE8D5), Color(0xFFA84426), Color(0xFFFFB26F))
private val STRONG_PURPLE = WidgetPalette(Color(0xFF7445B8), Color(0xFFFFF5FF), Color(0xFFF2DEFF), Color(0xFF523083), Color(0xFFC18AF1))
private val STRONG_PINK = WidgetPalette(Color(0xFFD81B90), Color(0xFFFFE4F3), Color(0xFFFFD3EA), Color(0xFFA8146C), Color(0xFFEF77BE))
private val DISCONNECTED_SPACE = WidgetPalette(Color(0xFF090D2E), Color(0xFFF8F1FF), Color(0xFFEBDFFF), Color(0xFF26204F), Color(0xFF9D65D8))
