package com.atutechbuilders.kernelpanic;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * KERNEL PANIC on the booth tablet: full screen (the system bars are hidden; a swipe from the
 * edge shows them for a moment) and the screen never goes to sleep while the game is open.
 * The back button is ignored by the web app (src/app/native.ts), so it can't close the game.
 * The launch screen (night blue, the red power symbol and the turning cyan ring) stays until the
 * game's opening animation is ready, then fades onto it.
 */
public class MainActivity extends BridgeActivity {

    /** Longest the launch screen waits for the web app, so a slow start never hangs on it. */
    private static final long LAUNCH_MAX_MS = 8000;

    private volatile boolean webReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        long started = SystemClock.uptimeMillis();
        long until = started + LAUNCH_MAX_MS;
        splash.setKeepOnScreenCondition(() -> !webReady && SystemClock.uptimeMillis() < until);
        // fade into the opening animation instead of cutting to it
        splash.setOnExitAnimationListener(view -> {
            Log.i("KernelPanic", "launch screen off after " + (SystemClock.uptimeMillis() - started)
                + " ms (" + (webReady ? "web app ready" : "time limit") + ")");
            view.getView().animate().alpha(0f).setDuration(260).withEndAction(view::remove).start();
        });
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
        waitForWebApp(until);
    }

    /**
     * The web app sets <html data-boot="ready"> once its opening animation is in the page
     * (src/fx/BootIntro.tsx); until then the launch screen stays.
     */
    private void waitForWebApp(long until) {
        Handler handler = new Handler(Looper.getMainLooper());
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (webReady || SystemClock.uptimeMillis() > until) return;
                WebView webView = getBridge() == null ? null : getBridge().getWebView();
                if (webView != null) {
                    webView.evaluateJavascript("document.documentElement.dataset.boot", value -> {
                        if ("\"ready\"".equals(value)) webReady = true;
                    });
                }
                handler.postDelayed(this, 60);
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
