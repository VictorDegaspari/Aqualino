package com.aqualino

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/** Keeps launcher aliases out of the Activity that hosts React Native. */
class LauncherActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    startActivity(Intent(this, MainActivity::class.java).apply {
      action = Intent.ACTION_MAIN
      addCategory(Intent.CATEGORY_LAUNCHER)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP
    })
    finish()
  }
}
