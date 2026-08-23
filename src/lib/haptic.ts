import vkBridge from '@vkontakte/vk-bridge';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

// Маппинг стилей для VK Bridge
const styleMap: Record<HapticStyle, 'light' | 'medium' | 'heavy'> = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  rigid: 'heavy',
  soft: 'light',
};

// Длительность вибрации для fallback (мс)
const vibrateDuration: Record<HapticStyle, number> = {
  light: 30,
  medium: 50,
  heavy: 80,
  rigid: 100,
  soft: 20,
};

/**
 * Вызывает тактильный отклик.
 * 
 * Приоритет:
 * 1. VK Bridge (если доступен)
 * 2. Navigator.vibrate (если поддерживается)
 * 3. Ничего (тихо игнорируем)
 * 
 * @param style - стиль вибрации (по умолчанию 'medium')
 */
export function triggerHaptic(style: HapticStyle = 'medium'): void {
  // Не вибрируем, если вкладка неактивна
  if (typeof document !== 'undefined' && document.hidden) return;

  // Пробуем VK Bridge
  try {
    if (
      vkBridge &&
      typeof vkBridge.supports === 'function' &&
      vkBridge.supports('VKWebAppTapticImpactOccurred')
    ) {
      void vkBridge.send('VKWebAppTapticImpactOccurred', { style: styleMap[style] });
      return;
    }
  } catch {
    // VK Bridge недоступен — пробуем navigator.vibrate
  }

  // Fallback на navigator.vibrate
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(vibrateDuration[style]);
    }
  } catch {
    // Вибрация не поддерживается — игнорируем
  }
}

/**
 * Проверяет, поддерживается ли тактильный отклик.
 */
export function isHapticSupported(): boolean {
  try {
    if (
      vkBridge &&
      typeof vkBridge.supports === 'function' &&
      vkBridge.supports('VKWebAppTapticImpactOccurred')
    ) {
      return true;
    }
  } catch {
    // VK Bridge не поддерживается
  }

  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      return true;
    }
  } catch {
    // navigator.vibrate не поддерживается
  }

  return false;
}
