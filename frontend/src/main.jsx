import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { store, persistor } from './store/store.js';
import { registerChunkLoadRecovery } from './chunkLoadRecovery.js';
import { setupAuthInterceptor } from './utils/authInterceptor.js';

registerChunkLoadRecovery();
setupAuthInterceptor(store.dispatch);

// Initialize theme dynamically to avoid flash of light theme
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
  document.documentElement.setAttribute('data-theme', 'dark');
} else {
  document.documentElement.classList.remove('dark');
  document.documentElement.setAttribute('data-theme', 'light');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    </BrowserRouter>
  </StrictMode>,
)
