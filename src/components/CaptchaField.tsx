'use client';

import { useEffect } from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

interface CaptchaFieldProps {
  register: UseFormRegister<any>;
  error?: string;
  setValue: UseFormSetValue<any>;
}

const CaptchaField = ({ register, error, setValue }: CaptchaFieldProps) => {
  useEffect(() => {
    // Register the captchaToken field with react-hook-form
    register('captchaToken', {
      required: 'Bitte bestätigen Sie, dass Sie kein Roboter sind.',
    });
    
    // Load reCAPTCHA script if it's not already loaded
    if (!window.grecaptcha) {
      window.onRecaptchaLoad = initRecaptcha;
      
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      return () => {
        document.head.removeChild(script);
      };
    } else {
      initRecaptcha();
    }
  }, [register]);
  
  const initRecaptcha = () => {
    if (window.grecaptcha && document.getElementById('recaptcha-container')) {
      try {
        window.grecaptcha.render('recaptcha-container', {
          sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // Google's test key
          callback: (token: string) => {
            setValue('captchaToken', token);
          },
          'expired-callback': () => {
            setValue('captchaToken', '');
          },
        });
      } catch (error) {
        console.error('reCAPTCHA error (development mode):', error);
        
        // In development, automatically set a fake token after a delay
        if (process.env.NODE_ENV !== 'production') {
          setTimeout(() => {
            setValue('captchaToken', 'dev-mode-fake-token');
            console.log('Set fake reCAPTCHA token in development mode');
          }, 500);
        }
      }
    } else {
      // If reCAPTCHA doesn't load in development, still allow form submission
      if (process.env.NODE_ENV !== 'production') {
        setValue('captchaToken', 'dev-mode-fake-token');
        console.log('Set fake reCAPTCHA token in development mode');
      }
    }
  };
  
  return (
    <div>
      <div id="recaptcha-container"></div>
      {error && <p className="mt-1 text-dark-crimson text-sm">{error}</p>}
    </div>
  );
};

export default CaptchaField;