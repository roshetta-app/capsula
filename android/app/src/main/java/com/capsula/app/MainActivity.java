package com.capsula.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // This app supports Android 7.0 through Android 16 (minSdk 24,
        // targetSdk 36). Android 15 started forcing edge-to-edge layout by
        // default, and Android 16 removed the ability to opt out of it
        // entirely — so rather than fighting the platform (which stops
        // working on newest phones and can't be "future-proofed"), this
        // accepts edge-to-edge on every version and manually reserves the
        // exact space the status/navigation bars need. This is Android's
        // own recommended approach and behaves consistently from the
        // oldest supported phones to the newest, without needing a
        // version-specific workaround.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        // Bug fix, 2026-09-06 (sheet-drag-elastic-scroll), REVERTED
        // 2026-09-07 — this used to call
        // getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER)
        // here, to suppress Android's native "edge glow" bounce on the
        // sheet's background. That call disables the WebView's native
        // scroll-boundary handling app-wide — not just for the background,
        // for every scrollable element in the app, including the sheet's
        // own scrollable content. It was added before the real cause of
        // the sheet's drag/scroll conflict was found and fixed on the JS
        // side (see SheetShell.jsx, 2026-09-07): the drag surface and the
        // scroll surface being the same element. That fix addresses the
        // conflict properly; this native-level override was very likely
        // fighting with it whenever a drag started over scrollable content,
        // producing the stutter reported over the specialty list (but not
        // over the sheet's header, which has nothing scrollable to
        // conflict with). Removed rather than narrowed, since the
        // background-bounce problem it was meant to solve is already
        // covered by the JS-side fix.
    }
}
