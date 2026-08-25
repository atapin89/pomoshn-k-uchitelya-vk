// src/lib/vkStorage.ts

import vkBridge from '@vkontakte/vk-bridge';

/**
 * Облачное хранилище VK для синхронизации прогресса между платформами.
 * Использует VK Bridge Storage API.
 */

const STORAGE_PREFIX = 'pomoshnik-uchitelya:';

// Проверка поддержки VK Storage
export function isVKStorageSupported(): boolean {
  try {
    return (
      vkBridge &&
      typeof vkBridge.supports === 'function' &&
      vkBridge.supports('VKWebAppStorageGet')
    );
  } catch {
    return false;
  }
}

// Получить значение из VK Storage
export async function vkStorageGet(key: string): Promise<string | null> {
  if (!isVKStorageSupported()) return null;
  
  try {
    const result = await vkBridge.send('VKWebAppStorageGet', {
      keys: [`${STORAGE_PREFIX}${key}`],
    });
    
    const value = result.keys?.find(
      (item: { key: string }) => item.key === `${STORAGE_PREFIX}${key}`,
    )?.value;
    
    return value || null;
  } catch {
    return null;
  }
}

// Сохранить значение в VK Storage
export async function vkStorageSet(key: string, value: string): Promise<boolean> {
  if (!isVKStorageSupported()) return false;
  
  try {
    await vkBridge.send('VKWebAppStorageSet', {
      key: `${STORAGE_PREFIX}${key}`,
      value,
    });
    return true;
  } catch {
    return false;
  }
}

// Получить несколько ключей
export async function vkStorageGetMany(keys: string[]): Promise<Record<string, string>> {
  if (!isVKStorageSupported()) return {};
  
  try {
    const result = await vkBridge.send('VKWebAppStorageGet', {
      keys: keys.map((k) => `${STORAGE_PREFIX}${k}`),
    });
    
    const resultObj: Record<string, string> = {};
    result.keys?.forEach((item: { key: string; value: string }) => {
      const originalKey = item.key.replace(STORAGE_PREFIX, '');
      resultObj[originalKey] = item.value;
    });
    
    return resultObj;
  } catch {
    return {};
  }
}

// Сохранить несколько ключей
export async function vkStorageSetMany(data: Record<string, string>): Promise<boolean> {
  if (!isVKStorageSupported()) return false;
  
  try {
    for (const [key, value] of Object.entries(data)) {
      await vkBridge.send('VKWebAppStorageSet', {
        key: `${STORAGE_PREFIX}${key}`,
        value,
      });
    }
    return true;
  } catch {
    return false;
  }
}
