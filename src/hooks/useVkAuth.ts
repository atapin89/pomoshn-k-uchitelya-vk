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
    const fetchUser = async () => {
      try {
        const userData = await bridge.send('VKWebAppGetUserInfo');

        setUser({
          id: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          avatar: userData.photo_200 || userData.photo_100 || '',
          city: userData.city?.title,
        });
      } catch (err) {
        console.error('VK auth error:', err);
        setError('Не удалось получить данные пользователя');

        if (import.meta.env.DEV) {
          setUser({
            id: 123456789,
            firstName: 'Тестовый',
            lastName: 'Пользователь',
            avatar: 'https://via.placeholder.com/200/7c3aed/ffffff?text=ТП',
            city: 'Москва',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, error };
}
