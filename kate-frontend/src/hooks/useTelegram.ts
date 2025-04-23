import { useEffect, useState } from 'react';
import {retrieveLaunchParams} from "@telegram-apps/sdk";

interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    initDataUnsafe?: {
        user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
        };
        auth_date?: number;
        hash?: string;
    };

    onEvent?: (eventType: string, eventHandler: () => void) => void;
    offEvent?: (eventType: string, eventHandler: () => void) => void;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

export const useTelegram = () => {
    const [tg, setTg] = useState<TelegramWebApp | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initTelegram = () => {
            try {localStorage.clear();

                // Проверяем мок-режим
                if (process.env.NODE_ENV === 'development' &&
                    process.env.REACT_APP_ENABLE_TELEGRAM_MOCK === 'true') {

                    const mockUser = {
                        id: 123456789,
                        first_name: 'Dev',
                        last_name: 'User'
                    };
                    const mockTg = {
                        ready: () => console.log('[MOCK] Telegram ready()'),
                        expand: () => console.log('[MOCK] Telegram expand()'),
                        initDataUnsafe: {
                            user: mockUser,
                            auth_date: Math.floor(Date.now() / 1000),
                            hash: 'mock-hash'
                        }
                    };

                setTg(mockTg);
                window.Telegram = { WebApp: mockTg };
                setIsLoading(false);
                
                
                

                    return;
                }

                const webApp = window?.Telegram?.WebApp;

                // Обработка события готовности
                const handleReady = () => {
                    console.log('Telegram WebApp is ready');
                    setTg({
                        ready: () => {},
                        expand: () => {},
                        initDataUnsafe: {
                            user: {
                                id: retrieveLaunchParams().tgWebAppData.user.id,
                                first_name: retrieveLaunchParams().tgWebAppData.user.first_name,
                                last_name: retrieveLaunchParams().tgWebAppData.user.last_name,
                                username: retrieveLaunchParams().tgWebAppData.user.username,
                                photo_url: retrieveLaunchParams().tgWebAppData.user.photo_url
                            },
                            auth_date: retrieveLaunchParams().tgWebAppData.auth_date.getDate(),
                            hash: retrieveLaunchParams().tgWebAppData.hash
                        }
                    });
                    setIsLoading(false);

                    // Раскрываем WebApp на весь экран
                    webApp?.expand();
                };

                // Проверяем, доступен ли onEvent
                if (webApp?.onEvent) {
                    webApp?.onEvent('webAppReady', handleReady);
                } else {
                    // Если onEvent недоступен, используем ready()
                    webApp?.ready();
                    handleReady();
                }

                // Возвращаем функцию очистки
                return () => {
                    if (webApp.offEvent) {
                        webApp.offEvent('webAppReady', handleReady);
                    }
                };
                

            } catch (e) {
                console.error('Telegram init error:', e);
                setIsLoading(false);
            }
        };

        // Добавляем небольшую задержку для гарантии загрузки Telegram WebApp
        const timer = setTimeout(initTelegram, 100);

        return () => clearTimeout(timer);
    }, []);

    return {
        tg,
        isLoading,
        user: tg?.initDataUnsafe?.user,
        userId: tg?.initDataUnsafe?.user?.id
    };
};