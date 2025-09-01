// ...existing code...
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ModalProvider } from './contexts/ModalContext';
import RoutesApp from './routes';
// ...existing code...

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ModalProvider>
       <RoutesApp/>
    </ModalProvider>
  </React.StrictMode>
);
// ...existing code...