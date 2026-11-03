package com.arrowescape.puzzle;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Security: Enable WebView debugging exclusively in Debug builds, never in Release
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        } else {
            WebView.setWebContentsDebuggingEnabled(false);
        }
    }
}
