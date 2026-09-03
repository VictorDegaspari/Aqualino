package com.aqualino.widget

import android.content.Context
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
    }
  }

  override fun readPendingAction(): String? {
    val preferences = reactApplicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
    val value = preferences.getString(PENDING_ACTION_KEY, null)
    preferences.edit().remove(PENDING_ACTION_KEY).apply()
    return value
  }

  override fun getSchemaVersion() = 1.0

  companion object {
    const val NAME = "NativeAqualinoWidget"
    const val PREFERENCES = "aqualino_widget"
    const val SNAPSHOT_KEY = "snapshot_json"
    const val PENDING_ACTION_KEY = "pending_action"
  }
}

