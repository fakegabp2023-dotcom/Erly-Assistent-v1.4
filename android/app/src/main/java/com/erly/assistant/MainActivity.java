package com.erly.assistant;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);

        webView.addJavascriptInterface(new AndroidBridge(), "ErlyAndroid");
        webView.loadUrl("file:///android_asset/erly/index.html");
    }

    private class AndroidBridge {
        @JavascriptInterface
        public void openUrl(String url) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openApp(String packageName) {
            try {
                Intent intent = getPackageManager().getLaunchIntentForPackage(packageName);
                if (intent != null) startActivity(intent);
            } catch (Exception ignored) {}
        }
    }
}
