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
    }
}
