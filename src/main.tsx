import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FirebaseCrashlytics } from '@capacitor-community/firebase-crashlytics';

// Inicializar Crashlytics al arrancar la aplicación móvil
FirebaseCrashlytics.setEnabled({ enabled: true }).catch((e) => {
  console.error("Error al activar Crashlytics:", e);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)