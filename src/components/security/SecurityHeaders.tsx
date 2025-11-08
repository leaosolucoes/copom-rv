import { Helmet } from 'react-helmet-async';

/**
 * Componente para adicionar headers de segurança via meta tags
 * Nota: Headers HTTP devem ser configurados no servidor/CDN para máxima efetividade
 */
export const SecurityHeaders = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return null;
  }

  return (
    <Helmet>
      {/* Content Security Policy */}
      <meta
        httpEquiv="Content-Security-Policy"
        content={`
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://*.supabase.co;
          style-src 'self' 'unsafe-inline' https://api.mapbox.com;
          img-src 'self' data: https: blob:;
          font-src 'self' data:;
          connect-src 'self' https://*.supabase.co https://api.mapbox.com https://events.mapbox.com wss://*.supabase.co;
          frame-src 'none';
          object-src 'none';
          base-uri 'self';
          form-action 'self';
          frame-ancestors 'none';
          upgrade-insecure-requests;
        `.replace(/\s+/g, ' ').trim()}
      />

      {/* X-Frame-Options - Prevenir clickjacking */}
      <meta httpEquiv="X-Frame-Options" content="DENY" />

      {/* X-Content-Type-Options - Prevenir MIME sniffing */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />

      {/* Referrer Policy - Não enviar referrer */}
      <meta name="referrer" content="no-referrer" />

      {/* Permissions Policy - Desabilitar features não necessárias */}
      <meta
        httpEquiv="Permissions-Policy"
        content="geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
      />

      {/* X-XSS-Protection (legado mas ainda útil) */}
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
    </Helmet>
  );
};
