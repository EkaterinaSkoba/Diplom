import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import { init } from '@telegram-apps/sdk';

// Комментируем инициализацию Telegram SDK для запуска без Telegram. ПОТОМ РАСКОММЕНТИРОВАТЬ
// if (process.env.REACT_APP_ENABLE_TELEGRAM_MOCK === 'false') {
//     init();
// }

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
