import vkBridge from '@vkontakte/vk-bridge';

/** true, если приложение открыто внутри VK (мобильный или десктоп). */
export function isVK(): boolean {
  try {
    return vkBridge.isEmbedded();
  } catch {
    return false;
  }
}

/** Корректное открытие внешней ссылки внутри VK. */
export function openExternalLink(url: string): void {
  if (isVK()) {
    vkBridge
      .send('VKWebAppOpenLink', { url })
      .catch(() => window.open(url, '_blank'));
    return;
  }
  window.open(url, '_blank');
}

/** «Поделиться» внутри VK, в браузере — navigator.share. */
export async function shareLink(link: string): Promise<boolean> {
  if (isVK()) {
    try {
      await vkBridge.send('VKWebAppShare', { link });
      return true;
    } catch {
      return false;
    }
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ url: link });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
