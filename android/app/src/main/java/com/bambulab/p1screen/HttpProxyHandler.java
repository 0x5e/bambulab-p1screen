package com.bambulab.p1screen;

import android.util.Log;

import fi.iki.elonen.NanoHTTPD;
import okhttp3.Headers;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class HttpProxyHandler {
  private static final String TAG = "HttpProxyHandler";
  private static final Set<String> HOP_BY_HOP_HEADERS = new HashSet<>(Arrays.asList(
    "connection",
    "content-length",
    "expect",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "x-powered-by"
  ));
  private static final Set<String> FORCED_PROXY_HEADERS = new HashSet<>(Arrays.asList(
    "user-agent",
    "accept-encoding"
  ));
  private static final NanoHTTPD.Response.IStatus BAD_GATEWAY = new NanoHTTPD.Response.IStatus() {
    @Override
    public String getDescription() { return "Bad Gateway"; }
    @Override
    public int getRequestStatus() { return 502; }
  };

  private final OkHttpClient httpClient = new OkHttpClient.Builder()
    .followRedirects(false)
    .followSslRedirects(false)
    .build();

  public NanoHTTPD.Response handle(NanoHTTPD.IHTTPSession session) {
    URI target;
    try {
      target = buildTargetUri(session);
    } catch (Exception e) {
      return NanoHTTPD.newFixedLengthResponse(
        NanoHTTPD.Response.Status.BAD_REQUEST,
        "text/plain",
        e.getMessage()
      );
    }

    Response okResponse = null;
    try {
      Request request = buildProxyRequest(session, target);
      okResponse = httpClient.newCall(request).execute();
      return buildProxyResponse(okResponse);
    } catch (Exception e) {
      Log.e(TAG, "proxy error", e);
      if (okResponse != null) okResponse.close();
      return NanoHTTPD.newFixedLengthResponse(
        BAD_GATEWAY,
        "text/plain",
        "Bad Gateway"
      );
    }
  }

  private Request buildProxyRequest(NanoHTTPD.IHTTPSession session, URI target) throws IOException {
    String method = session.getMethod().name();
    Request.Builder builder = new Request.Builder()
      .url(target.toString())
      .header("User-Agent", "bambu_network_agent/01.09.05.01")
      .header("Accept-Encoding", "gzip, deflate");
    for (Map.Entry<String, String> entry : session.getHeaders().entrySet()) {
      String name = entry.getKey();
      String lowerName = name.toLowerCase(Locale.US);
      if (HOP_BY_HOP_HEADERS.contains(lowerName) || FORCED_PROXY_HEADERS.contains(lowerName)) {
        continue;
      }
      String value = entry.getValue();
      if (value != null) {
        builder.header(name, value);
      }
    }

    if (permitsRequestBody(method)) {
      builder.method(method, createRequestBody(session));
    } else {
      builder.method(method, null);
    }
    return builder.build();
  }

  private RequestBody createRequestBody(NanoHTTPD.IHTTPSession session) throws IOException {
    byte[] bodyBytes = readRequestBody(session);
    String contentType = session.getHeaders().get("content-type");
    MediaType mediaType = contentType == null ? null : MediaType.parse(contentType);
    return RequestBody.create(mediaType, bodyBytes);
  }

  private byte[] readRequestBody(NanoHTTPD.IHTTPSession session) throws IOException {
    String lengthHeader = session.getHeaders().get("content-length");
    if (lengthHeader == null) {
      return new byte[0];
    }

    long remaining;
    try {
      remaining = Long.parseLong(lengthHeader);
    } catch (NumberFormatException e) {
      throw new IOException("Invalid content-length", e);
    }
    if (remaining <= 0) {
      return new byte[0];
    }

    ByteArrayOutputStream output = new ByteArrayOutputStream();
    byte[] buffer = new byte[8192];
    InputStream input = session.getInputStream();
    while (remaining > 0) {
      int read = input.read(buffer, 0, (int) Math.min(buffer.length, remaining));
      if (read < 0) {
        break;
      }
      output.write(buffer, 0, read);
      remaining -= read;
    }
    return output.toByteArray();
  }

  private NanoHTTPD.Response buildProxyResponse(Response okResponse) {
    final Response finalOkResponse = okResponse;
    ResponseBody body = okResponse.body();
    InputStream stream;
    long contentLength = -1;
    String contentType = "application/octet-stream";

    if (body == null) {
      stream = new ByteArrayInputStream(new byte[0]);
      contentLength = 0;
    } else {
      stream = new FilterInputStream(body.byteStream()) {
        @Override
        public void close() throws IOException {
          try {
            super.close();
          } finally {
            finalOkResponse.close();
          }
        }
      };
      contentLength = body.contentLength();
      if (body.contentType() != null) {
        contentType = body.contentType().toString();
      }
    }

    NanoHTTPD.Response.IStatus status = new NanoHTTPD.Response.IStatus() {
      @Override
      public String getDescription() { return finalOkResponse.message(); }
      @Override
      public int getRequestStatus() { return finalOkResponse.code(); }
    };

    NanoHTTPD.Response response;
    if (contentLength >= 0) {
      response = NanoHTTPD.newFixedLengthResponse(status, contentType, stream, contentLength);
    } else {
      response = NanoHTTPD.newChunkedResponse(status, contentType, stream);
    }

    Headers headers = okResponse.headers();
    for (int i = 0; i < headers.size(); i++) {
      String name = headers.name(i);
      String lowerName = name.toLowerCase(Locale.US);
      if (!HOP_BY_HOP_HEADERS.contains(lowerName)) {
        response.addHeader(name, headers.value(i));
      }
    }
    return response;
  }

  private static URI buildTargetUri(NanoHTTPD.IHTTPSession session) throws Exception {
    String uri = session.getUri();
    String encodedTarget = "";
    if (uri.length() > "/api/https".length()) {
      encodedTarget = uri.substring("/api/https".length()).replaceFirst("^/+", "");
    }

    if (encodedTarget.isEmpty()) {
      throw new IllegalArgumentException("Missing target host");
    }
    String[] parts = encodedTarget.split("/", 2);
    String targetHost = parts[0];
    if (targetHost == null || targetHost.isEmpty()) {
      throw new IllegalArgumentException("Missing target host");
    }
    String targetPath = parts.length > 1 ? "/" + parts[1] : "/";
    URI target = new URI("https://" + targetHost + targetPath);

    String query = session.getQueryParameterString();
    if (query != null && !query.isEmpty()) {
      target = new URI(
        target.getScheme(),
        target.getRawAuthority(),
        target.getRawPath(),
        query,
        target.getRawFragment()
      );
    }

    if (target.getHost() == null || target.getHost().isEmpty()) {
      throw new IllegalArgumentException("Missing target host");
    }
    return target;
  }

  private static boolean permitsRequestBody(String method) {
    return !"GET".equals(method) && !"HEAD".equals(method);
  }
}
