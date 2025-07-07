'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
  onError?: () => void;
  siteKey?: string;
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      render: (container: string | HTMLElement, parameters: Record<string, unknown>) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

export default function ReCaptcha({ onVerify, onError, siteKey }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use environment variable if no siteKey provided
  const effectiveSiteKey = siteKey || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    // Don't render if no site key
    if (!effectiveSiteKey) {
      return;
    }

    // Load reCAPTCHA script if not already loaded
    if (!document.querySelector('script[src*="recaptcha"]')) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=explicit`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Wait for reCAPTCHA to be ready
    const checkReady = () => {
      if (window.grecaptcha && window.grecaptcha.ready) {
        window.grecaptcha.ready(() => {
          if (containerRef.current && !widgetId) {
            try {
              const id = window.grecaptcha.render(containerRef.current, {
                sitekey: effectiveSiteKey,
                callback: (token: string) => {
                  onVerify(token);
                  setError(null);
                },
                'error-callback': () => {
                  setError('reCAPTCHA Fehler aufgetreten');
                  onError?.();
                },
                'expired-callback': () => {
                  onVerify(null);
                  setError('reCAPTCHA ist abgelaufen');
                }
              });
              setWidgetId(id);
              setIsLoaded(true);
            } catch {
              setError('reCAPTCHA konnte nicht geladen werden');
              onError?.();
            }
          }
        });
      } else {
        // Retry after a short delay
        setTimeout(checkReady, 100);
      }
    };

    checkReady();

    // Cleanup function
    return () => {
      if (widgetId !== null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetId);
        } catch {
          // Ignore reset errors
        }
      }
    };
  }, [effectiveSiteKey, onVerify, onError, widgetId]);

  // Don't render anything if no site key
  if (!effectiveSiteKey) {
    return null;
  }

  return (
    <Box sx={{ my: 2 }}>
      <div ref={containerRef} />
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
      {!isLoaded && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          reCAPTCHA wird geladen...
        </Typography>
      )}
    </Box>
  );
}