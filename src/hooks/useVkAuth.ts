import { useState, useEffect } from 'react';
import bridge from '@vkontakte/vk-bridge';

export interface VkUser {
  id: number;
  firstName: string;
  lastName: string;
  avatar: string;
  city?: string;
  email?: string;
}

export function useVkAuth() {
  const [user, setUser] = useState<VkUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Инициализация VK Bridge (обязательно в начале)
        await bridge.send('VKWebAppInit');

        // Получаем данные пользователя
        const userData = await bridge.send('VKWebAppGetUserInfo');

        // Опционально: получаем email (требует разрешения пользователя)
        let email: string | undefined;
        try {
          const scope = await bridge.send('VKWebAppGetEmail');
          email = scope.email;
        } catch {
          // Пользователь не дал разрешение на email — это нормально
        }

        setUser({
          id: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          avatar: userData.photo_200 || userData.photo_100 || '',
          city: userData.city?.title,
          email,
        });
      } catch (err) {
        console.error('VK auth error:', err);
        setError('Не удалось получить данные пользователя');
        // Fallback для тестирования вне VK (в браузере)
        if (import.meta.env.DEV) {
          setUser({
            id: 123456789,
            firstName: 'Тестовый',
            lastName: 'Пользователь',
            avatar: 'https://via.placeholder.com/200',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return { user, loading, error };
}
