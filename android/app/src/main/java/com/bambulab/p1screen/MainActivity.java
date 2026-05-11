package com.bambulab.p1screen;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.splashscreen.SplashScreen;

import java.io.IOException;

public final class MainActivity extends Activity {
  private static final String WEB_CONSOLE_TAG = "WebConsole";
  private static final String APP_INFO_TAG = "AppInfo";
  private static final int PORT = 8888;
  private static final long EXIT_INTERVAL_MS = 2000L;

  private WebView webView;
  private WebService webService;
  private long lastBackPressedAt;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    startWebService();

    SplashScreen.installSplashScreen(this);

    setContentView(R.layout.activity_main);

    webView = findViewById(R.id.web_view);
    webView.setPadding(0, 0, 0, 0);
    webView.setBackgroundColor(0xFF2C2C2C);
    webView.setHapticFeedbackEnabled(false);
    webView.setWebChromeClient(new WebChromeClient() {
      @Override
      public boolean onConsoleMessage(ConsoleMessage message) {
        switch (message.messageLevel()) {
          case TIP:
            Log.v(WEB_CONSOLE_TAG, message.message());
            break;
          case LOG:
            Log.d(WEB_CONSOLE_TAG, message.message());
            break;
          case WARNING:
            Log.w(WEB_CONSOLE_TAG, message.message());
            break;
          case ERROR:
            Log.e(WEB_CONSOLE_TAG, message.message());
            break;
          case DEBUG:
          default:
            Log.i(WEB_CONSOLE_TAG, message.message());
            break;
        }
        return true;
      }
    });

    webView.setWebViewClient(new WebViewClient() {
      @Override
      public void onPageFinished(WebView view, String url) {
        webView.setVisibility(View.VISIBLE);
      }
    });

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setLoadsImagesAutomatically(true);
    logRuntimeInfo(settings);

    WebView.setWebContentsDebuggingEnabled(true);

    applyWindowInsets();
    applyFullscreen();

    webView.loadUrl(getBaseUrl());
  }

  @Override
  protected void onResume() {
    super.onResume();
    startWebService();
  }

  @Override
  protected void onPause() {
    super.onPause();
    stopWebService();
  }

  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    applyFullscreen();
    View decorView = getWindow().getDecorView();
    decorView.requestApplyInsets();
  }

  @Override
  public void onBackPressed() {
    long now = SystemClock.elapsedRealtime();
    if (now - lastBackPressedAt < EXIT_INTERVAL_MS) {
      finishAndRemoveTask();
      return;
    }
    lastBackPressedAt = now;
    Toast.makeText(this, "再按一次返回键退出应用", Toast.LENGTH_SHORT).show();
  }

  private void applyFullscreen() {
    int orientation = getResources().getConfiguration().orientation;
    View decorView = getWindow().getDecorView();
    if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
      int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
//                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
//                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
      decorView.setSystemUiVisibility(flags);
    } else {
      decorView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
    }
  }

  private void applyWindowInsets() {
    View decorView = getWindow().getDecorView();
    decorView.setOnApplyWindowInsetsListener((v, insets) -> {
      int orientation = getResources().getConfiguration().orientation;
      if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
        v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), 0);
      } else {
        v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
      }
        return insets.consumeSystemWindowInsets();
    });
  }

  private void startWebService() {
    if (webService != null && webService.isAlive()) {
      return;
    }
    try {
      if (webService == null) {
        webService = new WebService(PORT, getApplicationContext());
      }
      webService.start();
    } catch (IOException e) {
      throw new IllegalStateException("Failed to start local web service", e);
    }
  }

  private void stopWebService() {
    if (webService == null) {
      return;
    }
    webService.stop();
  }

  private static String getBaseUrl() {
    return "http://127.0.0.1:" + PORT + "/";
  }

  private void logRuntimeInfo(WebSettings settings) {
    String appVersion = "unknown";
    try {
      appVersion = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
    } catch (Exception ignored) {
    }
    Log.i(APP_INFO_TAG, "appVersion=" + appVersion);
    Log.i(APP_INFO_TAG, "userAgentString=" + settings.getUserAgentString());
  }

  @Override
  protected void onDestroy() {
    stopWebService();
    if (webView != null) {
      ViewGroup parent = (ViewGroup) webView.getParent();
      if (parent != null) {
        parent.removeView(webView);
      }
      webView.stopLoading();
      webView.destroy();
      webView = null;
    }
    super.onDestroy();
  }
}
