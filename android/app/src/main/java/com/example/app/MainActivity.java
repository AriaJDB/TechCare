package com.example.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    private static final String CHANNEL_ID = "techcare_alertas_vencimiento";
    private static String pendingSerialToOpen = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        handleIntent(getIntent());

        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.addJavascriptInterface(new TechCareNativeBridge(), "TechCareNative");
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
        dispatchSerialToWebView();
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.hasExtra("numero_serie")) {
            String serial = intent.getStringExtra("numero_serie");
            if (serial != null && !serial.isEmpty()) {
                pendingSerialToOpen = serial;
            }
        }
    }

    private void dispatchSerialToWebView() {
        if (pendingSerialToOpen != null && !pendingSerialToOpen.isEmpty()) {
            final String serial = pendingSerialToOpen;
            runOnUiThread(() -> {
                Bridge bridge = getBridge();
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('techcare:abrir_equipo', { detail: { numeroSerie: '" + serial + "' } }));",
                        null
                    );
                }
            });
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Alertas Críticas de Mantenimiento TechCare";
            String description = "Notificaciones de semáforo en rojo y vencimientos de equipos en pantalla de bloqueo";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    public class TechCareNativeBridge {
        @JavascriptInterface
        public boolean saveLabelImage(String base64Data, String fileName) {
            try {
                if (base64Data == null || base64Data.isEmpty()) return false;
                String cleanBase64 = base64Data;
                int commaIdx = base64Data.indexOf(",");
                if (commaIdx != -1) {
                    cleanBase64 = base64Data.substring(commaIdx + 1);
                }
                byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                if (bitmap == null) return false;

                String safeName = (fileName == null || fileName.isEmpty())
                        ? "TechCare_Etiqueta_" + System.currentTimeMillis() + ".png"
                        : fileName;
                if (!safeName.toLowerCase().endsWith(".png")) {
                    safeName += ".png";
                }

                ContentResolver resolver = getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, safeName);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/TechCare");
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);
                }

                Uri imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (imageUri == null) return false;

                try (OutputStream out = resolver.openOutputStream(imageUri)) {
                    if (out == null) return false;
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    resolver.update(imageUri, values, null, null);
                }

                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Etiqueta guardada en Galería (Álbum TechCare)",
                        Toast.LENGTH_SHORT
                ).show());
                return true;
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= 33) {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{Manifest.permission.POST_NOTIFICATIONS},
                            1001
                    );
                }
            }
        }

        @JavascriptInterface
        public String getPendingEquipmentSerial() {
            String serial = pendingSerialToOpen;
            pendingSerialToOpen = null;
            return serial != null ? serial : "";
        }

        @JavascriptInterface
        public boolean sendMaintenanceNotification(String title, String body, String serial) {
            try {
                createNotificationChannel();
                requestNotificationPermission();

                Intent intent = new Intent(MainActivity.this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                intent.putExtra("numero_serie", serial != null ? serial : "");
                intent.setAction("OPEN_EQUIPO_" + (serial != null ? serial : System.currentTimeMillis()));
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pendingIntent = PendingIntent.getActivity(MainActivity.this, 0, intent, flags);

                NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_dialog_alert)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                        .setPriority(NotificationCompat.PRIORITY_MAX)
                        .setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setDefaults(NotificationCompat.DEFAULT_ALL)
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent);

                NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager != null) {
                    int notifId = (serial != null ? serial.hashCode() : (int) System.currentTimeMillis());
                    manager.notify(notifId, builder.build());
                    return true;
                }
                return false;
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }
    }
}
