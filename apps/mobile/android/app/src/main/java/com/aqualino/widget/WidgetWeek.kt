package com.aqualino.widget

import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

internal data class WidgetDay(val label: String, val completed: Boolean, val date: String, val frozen: Boolean = false)

internal fun widgetWeekDays(
  timezone: String,
  currentStreak: Int,
  totalMl: Int,
  generatedAt: String?,
  nowMillis: Long = System.currentTimeMillis(),
  frozenDates: Set<String> = emptySet(),
): List<WidgetDay> {
  val zone = TimeZone.getTimeZone(timezone)
  val today = Calendar.getInstance(zone).apply { timeInMillis = nowMillis }
  val todayDate = today.civilDate()
  val todayIndex = (today.get(Calendar.DAY_OF_WEEK) + 5) % 7
  val firstVisibleIndex = maxOf(0, todayIndex - 4)
  val completedDates = mutableSetOf<String>()

  // Anchor checks to the saved day: Sunday's cached water must not mark Monday.
  val generatedDate = generatedAt?.let(::parseSnapshotDate)
  if (generatedDate != null) {
    val completedDay = Calendar.getInstance(zone).apply {
      time = generatedDate
      if (totalMl < 50) add(Calendar.DATE, -1)
    }
    repeat(currentStreak.coerceIn(0, 7)) {
      completedDates.add(completedDay.civilDate())
      completedDay.add(Calendar.DATE, -1)
    }
  }

  val cursor = (today.clone() as Calendar).apply {
    add(Calendar.DATE, firstVisibleIndex - todayIndex)
  }
  val initials = arrayOf("S", "T", "Q", "Q", "S", "S", "D")
  return (0 until 5).map { index ->
    val date = cursor.civilDate()
    val frozen = date <= todayDate && date in frozenDates
    val day = WidgetDay(initials[firstVisibleIndex + index], date <= todayDate && date in completedDates && !frozen, date, frozen)
    cursor.add(Calendar.DATE, 1)
    day
  }
}

private fun Calendar.civilDate(): String = String.format(
  Locale.ROOT, "%04d-%02d-%02d", get(Calendar.YEAR), get(Calendar.MONTH) + 1, get(Calendar.DAY_OF_MONTH),
)

private fun parseSnapshotDate(value: String): Date? {
  for (pattern in listOf("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX")) {
    val position = ParsePosition(0)
    val parsed = SimpleDateFormat(pattern, Locale.ROOT).apply { isLenient = false }.parse(value, position)
    if (parsed != null && position.index == value.length) return parsed
  }
  return null
}
