import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import { WorkspaceProvider } from './lib/store';
import { FeedbackProvider } from './lib/feedback';
import App from './App';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <WorkspaceProvider>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </WorkspaceProvider>
    </HashRouter>
  </React.StrictMode>,
);
