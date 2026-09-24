'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Fintrack PWA Service Worker terdaftar dengan scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Pendaftaran Service Worker gagal:', error);
          });
      });
    }
  }, []);

  return null;
}
