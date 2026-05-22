package com.bambulab.p1screen;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.splashscreen.SplashScreen;

import java.io.IOException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

import org.json.JSONObject;
import org.json.JSONTokener;

public final class MainActivity extends Activity {
  private static final String WEB_CONSOLE_TAG = "WebConsole";
  private static final String APP_INFO_TAG = "AppInfo";
  private static final int PORT = 8888;
  private static final long EXIT_INTERVAL_MS = 2000L;
  private static final String APP_LIFECYCLE_FOREGROUND = "foreground";
  private static final String APP_LIFECYCLE_BACKGROUND = "background";
  private static final String GET_DEVICE_INFO_SCRIPT =
      "(function(){"
    + "try{"
    + "var getInfo=window.__P1ScreenGetDeviceInfo;"
    + "if(typeof getInfo!=='function')return '';"
    + "var info=getInfo();"
    + "return info==null?'':JSON.stringify(info,null,2);"
    + "}catch(e){return '';}"
    + "})()";

  private WebView webView;
  private WebService webService;
  private long lastBackPressedAt;
  private Toast exitToast;
  private final Handler mainHandler = new Handler(Looper.getMainLooper());

  @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
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
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return openExternalBrowserIfNeeded(request.getUrl());
      }

      @Override
      public boolean shouldOverrideUrlLoading(WebView view, String url) {
        return openExternalBrowserIfNeeded(Uri.parse(url));
      }

      @Override
      public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
        lastBackPressedAt = 0;
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        view.postDelayed(() -> view.setVisibility(View.VISIBLE), 800);
      }
    });

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setLoadsImagesAutomatically(true);
    webView.addJavascriptInterface(new NativeBridge(), "P1ScreenBridge");
    logRuntimeInfo(settings);

    WebView.setWebContentsDebuggingEnabled(true);

    applyWindowInsets();
    applyFullscreen();

    webView.loadUrl(getBaseUrl());
  }

  @Override
  protected void onResume() {
    super.onResume();
    dispatchAppLifecycleEvent(APP_LIFECYCLE_FOREGROUND);
  }

  @Override
  protected void onPause() {
    super.onPause();
    dispatchAppLifecycleEvent(APP_LIFECYCLE_BACKGROUND);
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
    if (webView != null && webView.canGoBack()) {
      webView.goBack();
      return;
    }
    long now = SystemClock.elapsedRealtime();
    if (now - lastBackPressedAt < EXIT_INTERVAL_MS) {
      finishAndRemoveTask();
      return;
    }
    lastBackPressedAt = now;
    if (exitToast != null) {
      exitToast.cancel();
    }
    exitToast = Toast.makeText(this, R.string.exit_toast, Toast.LENGTH_SHORT);
    exitToast.show();
  }

  private boolean openExternalBrowserIfNeeded(Uri uri) {
    if (uri == null || shouldHandleInWebView(uri)) {
      return false;
    }

    try {
      Intent intent = new Intent(Intent.ACTION_VIEW, uri);
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      startActivity(intent);
      return true;
    } catch (Exception e) {
      Log.e(APP_INFO_TAG, "Failed to open external url", e);
      return false;
    }
  }

  private static boolean shouldHandleInWebView(Uri uri) {
    String scheme = uri.getScheme();
    if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
      return true;
    }

    String host = uri.getHost();
    boolean isLocalHost = "127.0.0.1".equals(host) || "localhost".equalsIgnoreCase(host);
    return isLocalHost && !"/api/getDeviceInfo".equals(uri.getPath());
  }

  public final class NativeBridge {
    @JavascriptInterface
    public boolean isAvailable() {
      return true;
    }
  }

  private String getDeviceInfoJsonFromWebView() throws IOException {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      throw new IOException("Cannot request device info from the main thread");
    }

    if (webView == null) {
      throw new IOException("WebView is not available");
    }

    CountDownLatch latch = new CountDownLatch(1);
    AtomicReference<String> result = new AtomicReference<>();
    AtomicReference<Exception> error = new AtomicReference<>();

    mainHandler.post(() -> {
      if (webView == null) {
        error.set(new IOException("WebView is not available"));
        latch.countDown();
        return;
      }

      webView.evaluateJavascript(GET_DEVICE_INFO_SCRIPT, value -> {
        try {
          result.set(decodeJavascriptStringResult(value));
        } catch (Exception e) {
          error.set(e);
        } finally {
          latch.countDown();
        }
      });
    });

    try {
      latch.await();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IOException("Interrupted while requesting device info", e);
    }

    if (error.get() != null) {
      throw new IOException("Failed to request device info", error.get());
    }

    String deviceInfoJson = result.get();
    return deviceInfoJson == null ? "" : deviceInfoJson;
  }

  private static String decodeJavascriptStringResult(String value) throws Exception {
    if (value == null || "null".equals(value)) {
      return "";
    }
    Object decodedValue = new JSONTokener(value).nextValue();
    if (decodedValue == null || decodedValue == JSONObject.NULL) {
      return "";
    }
    return String.valueOf(decodedValue);
  }

  private void dispatchAppLifecycleEvent(String state) {
    if (webView == null) {
      return;
    }
    String script = "(function(){"
      + "var handler=window.__P1ScreenOnAppLifecycle;"
      + "if(typeof handler==='function'){handler(" + JSONObject.quote(state) + ");}"
      + "})()";
    webView.evaluateJavascript(script, null);
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
        webService = new WebService(PORT, getApplicationContext(), this::getDeviceInfoJsonFromWebView);
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
    webService = null;
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
