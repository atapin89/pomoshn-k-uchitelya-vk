import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import vkBridge from '@vkontakte/vk-bridge';
import App from './App.tsx';
import './index.css';
import { fullSync } from '@/lib/sync';
import { isVKStorageSupported } from '@/lib/vkStorage';

async function initVk() {
  try {
    await vkBridge.send('VKWebAppInit');
    await vkBridge.send('VKWebAppExpand' as never, {} as never);
    await vkBridge.send('VKWebAppSetViewSettings' as never, {
      status_bar_color: '#7c3aed',
      action_bar_color: '#7c3aed',
      navigation_bar_color: '#7c3aed',
    } as never);
    
    // Синхронизация прогресса между платформами
    if (isVKStorageSupported()) {
      console.log('[Sync] VK Storage доступен, синхронизируем...');
      await fullSync();
      console.log('[Sync] Синхронизация завершена');
    } else {
      console.log('[Sync] VK Storage недоступен, работаем локально');
    }
  } catch {
    // Приложение открыто вне VK — работаем как обычный сайт
    console.log('[Sync] Не в VK, синхронизация пропущена');
  }
}

void initVk();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
