# 📱 Guia para App Mobile - Rio Verde Denúncias

## 🚀 PWA (Progressive Web App) - Instalação Imediata

### Para PC (Windows/Mac/Linux):
1. Abra o sistema no **Chrome**, **Edge** ou **Firefox**
2. Clique no botão **"Instalar App"** que aparece no canto inferior direito
3. Ou clique no ícone de instalação na barra de endereços do navegador
4. O app será instalado como um programa nativo

### Para Mobile (iOS/Android):
1. Abra o sistema no **Safari** (iOS) ou **Chrome** (Android)
2. **iOS**: Toque em "Compartilhar" → "Adicionar à Tela de Início"
3. **Android**: Toque no menu → "Adicionar à tela inicial" ou no botão "Instalar App"

---

## 📲 App Nativo Mobile (iOS/Android) - via Capacitor

Para criar aplicativos nativos para publicação nas lojas:

### Pré-requisitos:
- **iOS**: Mac com Xcode instalado
- **Android**: Android Studio instalado
- Node.js e npm instalados

### Passos para Desenvolvimento:

1. **Exportar projeto do Lovable:**
   - Clique em "Export to Github" no Lovable
   - Faça git pull do seu repositório

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Inicializar Capacitor:**
   ```bash
   npx cap init
   ```

4. **Adicionar plataformas:**
   ```bash
   npx cap add ios     # Para iOS
   npx cap add android # Para Android
   ```

5. **Construir o projeto:**
   ```bash
   npm run build
   ```

6. **Sincronizar com plataformas nativas:**
   ```bash
   npx cap sync
   ```

7. **Executar no dispositivo/emulador:**
   ```bash
   npx cap run ios     # Para iOS
   npx cap run android # Para Android
   ```

### Configurações já incluídas:
- ✅ App ID: `app.lovable.668e639ddc0b4b7aab49c9f19cc751b2`
- ✅ Nome: `rio-verde-sossego-denuncias`
- ✅ Ícones gerados automaticamente
- ✅ Splash screen configurada
- ✅ Hot-reload habilitado para desenvolvimento

### Para Publicação:
1. **iOS**: Abra o projeto no Xcode e faça upload para App Store
2. **Android**: Gere APK/AAB no Android Studio e publique no Google Play

---

## 🔧 Manutenção

Sempre que fizer mudanças no código:

1. Faça git pull das mudanças
2. Execute: `npm run build`
3. Execute: `npx cap sync`

---

## 📋 Recursos do App:

### PWA:
- ✅ Instalação em 1 clique
- ✅ Funciona offline (cache básico)
- ✅ Ícone na área de trabalho
- ✅ Splash screen
- ✅ Tema personalizado

### App Nativo:
- ✅ Performance nativa
- ✅ Acesso a recursos do dispositivo
- ✅ Publicação em lojas oficiais
- ✅ Notificações push (pode ser adicionado)
- ✅ Câmera e GPS integrados

O sistema agora está preparado para ser um aplicativo completo! 🎉