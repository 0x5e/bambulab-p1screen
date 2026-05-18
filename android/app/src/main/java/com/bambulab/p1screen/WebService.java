package com.bambulab.p1screen;

import android.content.Context;
import android.content.res.AssetManager;
import android.text.TextUtils;
import android.util.Log;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

public final class WebService extends NanoWSD {
  private static final String TAG = "WebService";

  private final Context appContext;
  private final FetchHandler fetchHandler;
  private final HttpProxyHandler httpProxyHandler;

  public WebService(int port, Context context) {
    super(port);
    appContext = context;
    fetchHandler = new FetchHandler();
    httpProxyHandler = new HttpProxyHandler();
  }

  @Override
  public void start() throws IOException {
    start(0, false);
    Log.i(TAG, "started on port " + getListeningPort());
  }

  @Override
  public void stop() {
    super.stop();
    Log.i(TAG, "stopped");
  }

  @Override
  protected Response serveHttp(IHTTPSession session) {
    Log.d(TAG, "http " + session.getMethod() + " " + session.getUri());

    String uri = session.getUri();
    if (uri.startsWith("/api/https/")) {
      return httpProxyHandler.handle(session);
    }

    if (Method.GET != session.getMethod()) {
      return NanoHTTPD.newFixedLengthResponse(Response.Status.METHOD_NOT_ALLOWED, "text/plain", "Method Not Allowed");
    }

    if ("/api/fetch".equals(uri)) {
      return fetchHandler.handle(session);
    }
    return serveStatic(session);
  }

  @Override
  protected WebSocket openWebSocket(IHTTPSession handshake) {
    Log.d(TAG, "ws handshake " + handshake.getUri());
    return new WsTlsBridge(handshake);
  }

  private Response serveStatic(IHTTPSession session) {
    String uri = session.getUri();
    if (TextUtils.isEmpty(uri) || "/".equals(uri)) {
      uri = "/index.html";
    }
    if (uri.contains("..")) {
      return NanoHTTPD.newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Forbidden");
    }

    AssetResult asset = openAsset(uri);
    if (asset == null) {
      Log.w(TAG, "static miss " + uri);
      return NanoHTTPD.newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found");
    }

    Log.d(TAG, "static hit " + uri + " -> " + asset.path);
    return NanoHTTPD.newChunkedResponse(Response.Status.OK, guessMimeType(asset.path), asset.inputStream);
  }

  private AssetResult openAsset(String uri) {
    AssetManager assets = appContext.getAssets();
    String normalized = uri.startsWith("/") ? uri.substring(1) : uri;
    String[] candidates = new String[]{
      "web/" + normalized,
      normalized,
    };

    for (String path : candidates) {
      try {
        return new AssetResult(path, assets.open(path));
      } catch (IOException ignored) {
      }
    }
    return null;
  }

  private static String guessMimeType(String path) {
    String lower = path.toLowerCase(Locale.US);
    if (lower.endsWith(".html")) return "text/html; charset=utf-8";
    if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
    if (lower.endsWith(".css")) return "text/css; charset=utf-8";
    if (lower.endsWith(".svg")) return "image/svg+xml";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".json")) return "application/json; charset=utf-8";
    if (lower.endsWith(".ico")) return "image/x-icon";
    return "application/octet-stream";
  }

  private static final class AssetResult {
    final String path;
    final InputStream inputStream;

    AssetResult(String path, InputStream inputStream) {
      this.path = path;
      this.inputStream = inputStream;
    }
  }
}
