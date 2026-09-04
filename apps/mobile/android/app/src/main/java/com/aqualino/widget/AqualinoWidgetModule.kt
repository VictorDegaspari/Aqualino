package com.aqualino.widget

import android.content.Context
import android.content.ComponentName
import android.content.pm.PackageManager
import androidx.glance.appwidget.updateAll
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AqualinoWidgetModule(reactContext: ReactApplicationContext) : NativeAqualinoWidgetSpec(reactContext) {
  override fun getName() = NAME

  override fun writeSnapshot(snapshotJson: String): Boolean =
    reactApplicationContext
      .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
      .edit()
      .putString(SNAPSHOT_KEY, snapshotJson)
      .commit()

  override fun requestReload() {
    CoroutineScope(Dispatchers.IO).launch {
      AqualinoGlanceWidget().updateAll(reactApplicationContext)
      AqualinoSmallGlanceWidget().updateAll(reactApplicationContext)
    }
  }

  override fun readPendingAction(): String? {
    val preferences = reactApplicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
    val value = preferences.getString(PENDING_ACTION_KEY, null)
    preferences.edit().remove(PENDING_ACTION_KEY).apply()
    return value
  }

  override fun getSchemaVersion() = SCHEMA_VERSION.toDouble()

  override fun setAppIconMood(mood: String): Boolean = runCatching {
    val packageManager = reactApplicationContext.packageManager
    val happyIcon = ComponentName(reactApplicationContext, "com.aqualino.MainActivityHappy")
    val sadIcon = ComponentName(reactApplicationContext, "com.aqualino.MainActivitySad")
    val selected = if (mood == SAD_ICON_MOOD) sadIcon else happyIcon
    val hidden = if (mood == SAD_ICON_MOOD) happyIcon else sadIcon

    if (packageManager.getComponentEnabledSetting(selected) !=
      PackageManager.COMPONENT_ENABLED_STATE_ENABLED
    ) {
      packageManager.setComponentEnabledSetting(
        selected,
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
        PackageManager.DONT_KILL_APP,
      )
    }
    if (packageManager.getComponentEnabledSetting(hidden) !=
      PackageManager.COMPONENT_ENABLED_STATE_DISABLED
    ) {
      packageManager.setComponentEnabledSetting(
        hidden,
        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
        PackageManager.DONT_KILL_APP,
      )
    }
  }.isSuccess

  companion object {
    const val NAME = "NativeAqualinoWidget"
    const val SCHEMA_VERSION = 2
    const val PREFERENCES = "aqualino_widget"
    const val SNAPSHOT_KEY = "snapshot_json"
    const val PENDING_ACTION_KEY = "pending_action"
    const val SAD_ICON_MOOD = "sad"
  }
}
