import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import vkBridge from '@vkontakte/vk-bridge';
import App from './App.tsx';
import './index.css';

async function initVk() {
  try {
    await vkBridge.send('VKWebAppInit');
    await vkBridge.send('VKWebAppExpand' as never, {} as never);
    await vkBridge.send('VKWebAppSetViewSettings' as never, {
      status_bar_color: '#7c3aed',
      action_bar_color: '#7c3aed',
      navigation_bar_color: '#7c3aed',
    } as never);
  } catch {
    // Приложение открыто вне VK — работаем как обычный сайт
  }
}

void initVk();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
