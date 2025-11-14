# Configuração de Permissões do Android

## Localização do Arquivo
Após executar `npx cap add android`, o arquivo estará em:
```
android/app/src/main/AndroidManifest.xml
```

## Permissões Necessárias para o COPOM Rio Verde

### 1. Internet e Conectividade
```xml
<!-- Comunicação com Supabase e APIs -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 2. Localização GPS
```xml
<!-- Captura automática de coordenadas nas denúncias -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

### 3. Câmera
```xml
<!-- Tirar fotos de evidências diretamente pelo app -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

### 4. Galeria e Armazenamento
```xml
<!-- Para Android 13+ (API 33+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />

<!-- Para Android 12 e inferiores (API 32 e abaixo) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
                 android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                 android:maxSdkVersion="29" />
```

### 5. Notificações
```xml
<!-- Para Android 13+ (API 33+) - Alertas de novas denúncias -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

## AndroidManifest.xml Completo

Adicione as permissões DENTRO da tag `<manifest>`, ANTES da tag `<application>`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- ========== PERMISSÕES DO COPOM RIO VERDE ========== -->
    
    <!-- Internet (essencial) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Localização GPS (denúncias) -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />

    <!-- Câmera (evidências fotográficas) -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <!-- Galeria e Mídia -->
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
                     android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                     android:maxSdkVersion="29" />

    <!-- Notificações (Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- ========== FIM DAS PERMISSÕES ========== -->

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>

</manifest>
```

## Passo a Passo para Implementar

### 1. Exportar o Projeto
- Clique em "Export to Github" no Lovable
- Faça `git clone` do repositório na sua máquina

### 2. Instalar Dependências
```bash
npm install
```

### 3. Adicionar Plataforma Android
```bash
npx cap add android
```

### 4. Editar AndroidManifest.xml
- Abra `android/app/src/main/AndroidManifest.xml`
- Adicione TODAS as permissões listadas acima dentro de `<manifest>`, ANTES de `<application>`

### 5. Sincronizar
```bash
npx cap sync android
```

### 6. Abrir no Android Studio
```bash
npx cap open android
```

### 7. Executar no Emulador/Dispositivo
- No Android Studio: Run > Run 'app'
- Ou via terminal: `npx cap run android`

## Comportamento no Dispositivo

Quando o usuário abrir o app pela primeira vez:

✅ **Ao fazer denúncia**: Solicitará permissão de localização  
✅ **Ao adicionar foto**: Solicitará permissão de câmera e galeria  
✅ **Ao receber alerta**: Solicitará permissão de notificações (Android 13+)  

Se o usuário negar alguma permissão:
- Localização negada → Denúncia enviada sem coordenadas GPS
- Câmera negada → Pode selecionar foto da galeria
- Notificações negadas → Não receberá alertas de novas denúncias

## Funcionalidades que Dependem das Permissões

| Permissão | Arquivo | Funcionalidade |
|-----------|---------|----------------|
| `ACCESS_FINE_LOCATION` | `PublicComplaintForm.tsx` | Captura automática de GPS da denúncia |
| `CAMERA` | `PublicComplaintForm.tsx` | Tirar foto de evidência diretamente |
| `READ_MEDIA_IMAGES` | `PublicComplaintForm.tsx` | Selecionar fotos da galeria |
| `READ_MEDIA_VIDEO` | `PublicComplaintForm.tsx` | Selecionar vídeos da galeria |
| `POST_NOTIFICATIONS` | `notificationUtils.ts` | Alertar atendentes sobre novas denúncias |
| `INTERNET` | Todo o sistema | Comunicação com Supabase |

## Notas Importantes

⚠️ **O Capacitor já adiciona automaticamente:**
- `INTERNET`
- `ACCESS_NETWORK_STATE`

Mas é recomendado manter explicitamente para documentação.

⚠️ **Compatibilidade:**
- `android:required="false"` garante que o app funcione em dispositivos sem hardware específico
- `android:maxSdkVersion` garante compatibilidade com diferentes versões do Android

⚠️ **Segurança:**
- Todas as permissões são solicitadas em tempo de execução (runtime permissions)
- O usuário pode revogar permissões a qualquer momento nas configurações do Android
