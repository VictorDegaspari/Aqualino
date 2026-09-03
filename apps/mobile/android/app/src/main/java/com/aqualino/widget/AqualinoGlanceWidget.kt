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
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import org.json.JSONObject

data class AqualinoWidgetSnapshot(
  val totalMl: Int = 0,
  val goalMl: Int = 0,
  val days: Int? = null,
  val condition: String = "empty",
  val stale: Boolean = true,
)

class AqualinoGlanceWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val snapshot = readSnapshot(context)
    provideContent { AqualinoWidgetContent(snapshot) }
  }

  private fun readSnapshot(context: Context): AqualinoWidgetSnapshot {
    val raw = context.getSharedPreferences(AqualinoWidgetModule.PREFERENCES, Context.MODE_PRIVATE)
      .getString(AqualinoWidgetModule.SNAPSHOT_KEY, null) ?: return AqualinoWidgetSnapshot()
    return runCatching {
      val json = JSONObject(raw)
      if (json.optInt("schema_version") != 1) return AqualinoWidgetSnapshot()
      val generatedAt = java.time.Instant.parse(json.getString("generated_at"))
      AqualinoWidgetSnapshot(
        totalMl = json.optInt("today_total_ml"),
        goalMl = json.optInt("daily_goal_ml"),
        days = if (json.isNull("days_since_last_log")) null else json.optInt("days_since_last_log"),
        condition = json.optString("condition", "empty"),
        stale = generatedAt.isBefore(java.time.Instant.now().minusSeconds(21_600)),
      )
    }.getOrDefault(AqualinoWidgetSnapshot())
  }
}

class AqualinoWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = AqualinoGlanceWidget()
}

@Composable
private fun AqualinoWidgetContent(snapshot: AqualinoWidgetSnapshot) {
  val isMedium = LocalSize.current.width >= 180.dp
  val deepLink = Intent(Intent.ACTION_VIEW, Uri.parse("aqualino://hydrate/quick?source=widget"))
  val temporalText = when (snapshot.days) {
    null -> "Ainda não há registros"
    0 -> "Bebeu água hoje"
    1 -> "Último registro há 1 dia"
    else -> "Há ${snapshot.days} dias sem registrar"
  }

  Row(
    modifier = GlanceModifier.fillMaxSize().background(ColorProvider(Color(0xFFF4FBFC))).padding(14.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
      Text(text = mascotGlyph(snapshot.condition), style = TextStyle(fontSize = 38.sp))
      Text(text = temporalText, style = TextStyle(color = ColorProvider(Color(0xFF102A2E)), fontSize = 13.sp))
      if (snapshot.stale) {
        Text(text = "Dados podem estar desatualizados", style = TextStyle(color = ColorProvider(Color(0xFF557176)), fontSize = 10.sp))
      }
    }
    if (isMedium) {
      Column(modifier = GlanceModifier.padding(start = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = "${snapshot.totalMl} / ${snapshot.goalMl} ml",
          style = TextStyle(color = ColorProvider(Color(0xFF075E68)), fontSize = 16.sp, fontWeight = FontWeight.Bold))
        Text(
          text = "+ Registrar",
          modifier = GlanceModifier.background(ColorProvider(Color(0xFF075E68)))
            .padding(top = 10.dp, start = 8.dp, end = 8.dp, bottom = 10.dp)
            .clickable(actionStartActivity(deepLink)),
          style = TextStyle(
            color = ColorProvider(Color(0xFFFFFFFF)),
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
          ),
        )
      }
    }
  }
}

private fun mascotGlyph(condition: String) = when (condition) {
  "angry" -> "💢"
  "boiling" -> "♨️"
  "skeleton" -> "🩻"
  else -> "💧"
}
