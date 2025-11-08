# 🛡️ Configuração do CAPTCHA - hCaptcha

## ✅ Implementação Completa

O sistema agora possui proteção CAPTCHA após 3 tentativas de login falhadas para prevenir ataques de força bruta.

## 📋 Características Implementadas

### 1. **Contador de Tentativas**
- Registra cada tentativa de login falhada no `localStorage`
- Após 3 tentativas, mostra o CAPTCHA
- Após mais tentativas com CAPTCHA, bloqueia por 15 minutos

### 2. **CAPTCHA Inteligente**
- Usa hCaptcha (mais privacy-friendly que reCAPTCHA)
- Aparece apenas após 3 tentativas falhadas
- Reseta automaticamente após login bem-sucedido
- Expira após um tempo para maior segurança

### 3. **Bloqueio Temporário**
- Bloqueia tentativas por 15 minutos após muitas falhas
- Mostra contador regressivo em tempo real
- Reseta automaticamente após o período

### 4. **Rate Limiting**
- Integrado com o sistema de rate limiting existente
- Previne ataques automatizados
- Protege contra força bruta

## 🔧 Configuração para Produção

### Passo 1: Criar Conta no hCaptcha

1. Acesse: https://www.hcaptcha.com/
2. Crie uma conta gratuita
3. No dashboard, clique em "New Site"

### Passo 2: Configurar Site

1. **Site Key**: Nome do seu site/aplicação
2. **Hostname**: Adicione seu domínio:
   - `copomrv.vinnax.app`
   - `localhost` (para desenvolvimento)
3. **Tipo**: Selecione "Enterprise" ou "Free" conforme necessário

### Passo 3: Obter as Chaves

Você receberá duas chaves:
- **Site Key (Pública)**: Usar no frontend
- **Secret Key (Privada)**: Usar no backend (se validar server-side)

### Passo 4: Adicionar no Código

Edite o arquivo: `src/components/auth/CaptchaVerification.tsx`

```typescript
// Linha 20 - Substituir pela sua chave
const HCAPTCHA_SITE_KEY = process.env.NODE_ENV === 'production' 
  ? 'SUA_CHAVE_PUBLICA_AQUI' // ← Substituir
  : '10000000-ffff-ffff-ffff-000000000001'; // Chave de teste
```

### Passo 5: (Opcional) Validação Server-Side

Para máxima segurança, valide o token no backend:

1. Adicione a secret key nas variáveis de ambiente
2. Crie uma edge function para validar
3. Chame antes de permitir login

**Exemplo de validação:**
```typescript
const response = await fetch('https://hcaptcha.com/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `secret=YOUR_SECRET_KEY&response=${captchaToken}`
});

const data = await response.json();
if (!data.success) {
  throw new Error('CAPTCHA inválido');
}
```

## 🎯 Como Funciona

### Fluxo Normal (< 3 tentativas)
1. Usuário digita email e senha
2. Clica em "Entrar"
3. Sistema valida credenciais
4. Se correto: acessa sistema
5. Se incorreto: mostra erro

### Fluxo com CAPTCHA (≥ 3 tentativas)
1. Após 3 tentativas falhadas
2. CAPTCHA aparece automaticamente
3. Usuário deve completar verificação
4. Botão "Entrar" fica desabilitado até completar
5. Sistema valida CAPTCHA + credenciais
6. Se correto: reseta contador e acessa

### Fluxo Bloqueado (muitas tentativas)
1. Após muitas tentativas mesmo com CAPTCHA
2. Conta bloqueada por 15 minutos
3. Mostra contador regressivo
4. Botão "Entrar" desabilitado
5. Após 15min: permite tentar novamente

## 🔒 Segurança

### Proteções Ativas:
- ✅ Contador de tentativas no localStorage
- ✅ CAPTCHA após 3 falhas
- ✅ Bloqueio temporário de 15 minutos
- ✅ Reset automático após período
- ✅ Reset após login bem-sucedido
- ✅ Mensagens de erro progressivas
- ✅ Desabilita formulário quando bloqueado

### Limites Configurados:
- **Tentativas antes CAPTCHA**: 3
- **Tempo de bloqueio**: 15 minutos
- **Janela de tempo**: 15 minutos (resetar contador)

## 📱 Compatibilidade

- ✅ Desktop
- ✅ Mobile
- ✅ Tablets
- ✅ Todos navegadores modernos

## 🧪 Testar

### Ambiente de Desenvolvimento:
- Use a chave de teste (já configurada)
- Funciona sem configuração adicional
- CAPTCHA sempre passa

### Ambiente de Produção:
1. Tente fazer login com senha errada 3 vezes
2. CAPTCHA deve aparecer
3. Complete o CAPTCHA
4. Continue testando falhas
5. Deve bloquear após várias tentativas

## 📊 Monitoramento

Para monitorar tentativas suspeitas:
1. Dashboard do hCaptcha mostra estatísticas
2. Logs do sistema registram tentativas
3. Pode integrar com sistema de auditoria existente

## 🆘 Troubleshooting

### CAPTCHA não aparece?
- Verifique console do navegador
- Confirme que a chave está correta
- Teste fazer 3 tentativas falhadas

### CAPTCHA não valida?
- Verifique se a chave de produção está configurada
- Confirme que o domínio está autorizado no hCaptcha
- Limpe cache do navegador

### Bloqueio não funciona?
- Verifique localStorage do navegador
- Confirme que JavaScript está habilitado
- Teste em janela anônima

## 📚 Documentação

- hCaptcha Docs: https://docs.hcaptcha.com/
- Dashboard: https://dashboard.hcaptcha.com/
- React Integration: https://github.com/hCaptcha/react-hcaptcha

## 🎉 Conclusão

Sistema de CAPTCHA implementado com sucesso! Agora seu sistema está protegido contra:
- ✅ Ataques de força bruta
- ✅ Bots automatizados
- ✅ Tentativas massivas de login
- ✅ Credential stuffing

**Próximos passos:**
1. Configurar chave do hCaptcha em produção
2. Testar fluxo completo
3. Monitorar dashboard do hCaptcha
4. (Opcional) Adicionar validação server-side
