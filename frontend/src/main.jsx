import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster position="top-right" toastOptions={{ style: { background: '#1c1e2a', color: '#e2e4f0', border: '1px solid #2a2d3e' }, success: { iconTheme: { primary: '#4f5eff', secondary: '#fff' } } }} />
  </QueryClientProvider>
);
