import 'regenerator-runtime/runtime';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { store } from './app/store';
import App from './App.jsx';
import './index.css';

const clientId =
  '870413778352-3vtpln31uiods5s2v0epiioj72i624k8.apps.googleusercontent.com';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <GoogleOAuthProvider clientId={clientId}>
    <Provider store={store}>
      <App />
    </Provider>
  </GoogleOAuthProvider>
);
// Limpieza de versiones antiguas del Service Worker para evitar que Safari/iPhone
// siga sirviendo un bundle viejo de MIRÚ.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    }).catch(() => {});
    if (window.caches) {
      window.caches.keys().then((keys) => keys.forEach((key) => window.caches.delete(key))).catch(() => {});
    }
  });
}
