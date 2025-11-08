import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initConsoleProtection } from './utils/consoleProtection'

// Inicializar proteção do console ANTES de qualquer outra coisa
initConsoleProtection();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);
