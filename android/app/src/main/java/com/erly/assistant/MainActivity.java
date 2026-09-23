package com.erly.assistant;

import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.util.Locale;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private TextToSpeech textToSpeech;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        prefs = getSharedPreferences("erly_prefs", MODE_PRIVATE);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        webView.addJavascriptInterface(new AndroidBridge(), "ErlyAndroid");
        webView.loadUrl("file:///android_asset/erly/index.html");

        textToSpeech = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech.setLanguage(new Locale("es", "ES"));
            }
        });
    }

    public class AndroidBridge {
        @JavascriptInterface
        public String getBackendUrl() {
            return prefs.getString("backend_url", "");
        }

        @JavascriptInterface
        public boolean setBackendUrl(String url) {
            String value = url == null ? "" : url.trim().replaceAll("/$", "");
            if (value.isEmpty()) {
                prefs.edit().remove("backend_url").apply();
                return true;
            }
            if (!value.matches("^https?://[^\\s]+$")) return false;
            prefs.edit().putString("backend_url", value).apply();
            return true;
        }

        @JavascriptInterface
        public boolean openUrl(String url) {
            try {
                Uri uri = Uri.parse(url);
                String scheme = uri.getScheme();
                if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
                    return false;
                }
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(intent);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean openApp(String packageName) {
            try {
                if (packageName == null || !packageName.matches("[A-Za-z0-9_.]+")) return false;
                Intent intent = getPackageManager().getLaunchIntentForPackage(packageName);
                if (intent == null) return false;
                startActivity(intent);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, String.valueOf(message), Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void speak(String text, float rate, float pitch) {
            if (textToSpeech == null || text == null || text.trim().isEmpty()) return;
            runOnUiThread(() -> {
                try {
                    textToSpeech.setSpeechRate(Math.max(0.5f, Math.min(2.0f, rate)));
                    textToSpeech.setPitch(Math.max(0.5f, Math.min(2.0f, pitch)));
                    textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "erly_speech");
                } catch (Exception ignored) {}
            });
        }
    }

    @Override
    protected void onDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
