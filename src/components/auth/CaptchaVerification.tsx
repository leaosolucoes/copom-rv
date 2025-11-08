import { useRef, forwardRef, useImperativeHandle } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface CaptchaVerificationProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export interface CaptchaVerificationRef {
  reset: () => void;
}

/**
 * Componente de verificação CAPTCHA usando hCaptcha
 * Mais privacy-friendly que reCAPTCHA
 */
export const CaptchaVerification = forwardRef<CaptchaVerificationRef, CaptchaVerificationProps>(
  ({ onVerify, onError, onExpire }, ref) => {
    const captchaRef = useRef<HCaptcha>(null);

    // Site key pública do hCaptcha (deve ser configurada)
    // Para desenvolvimento, use uma chave de teste
    const HCAPTCHA_SITE_KEY = process.env.NODE_ENV === 'production' 
      ? '10000000-ffff-ffff-ffff-000000000001' // SUBSTITUIR pela chave real em produção
      : '10000000-ffff-ffff-ffff-000000000001'; // Chave de teste

    useImperativeHandle(ref, () => ({
      reset: () => {
        captchaRef.current?.resetCaptcha();
      },
    }));

    const handleVerify = (token: string) => {
      onVerify(token);
    };

    const handleError = () => {
      onError?.();
    };

    const handleExpire = () => {
      onExpire?.();
    };

    return (
      <div className="space-y-3">
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Shield className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            Por segurança, confirme que você não é um robô para continuar.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            onVerify={handleVerify}
            onError={handleError}
            onExpire={handleExpire}
            theme="light"
          />
        </div>
      </div>
    );
  }
);

CaptchaVerification.displayName = 'CaptchaVerification';
