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
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initTelegram = () => {
            try {
                // 1. Проверяем, находимся ли мы в Telegram WebView
                const isTelegramWebView = window.Telegram && window.Telegram.WebApp;
                
                // // 2. Режим разработки с мок-данными
                // if (process.env.NODE_ENV === 'development' && 
                //     process.env.REACT_APP_ENABLE_TELEGRAM_MOCK === 'true') {
                    
                //     const mockUser = {
                //         id: 123456789,
                //         first_name: 'Dev',
                //         last_name: 'User'
                //     };
                    
                //     const mockTg = {
                //         ready: () => console.log('[MOCK] Telegram ready()'),
                //         expand: () => console.log('[MOCK] Telegram expand()'),
                //         initDataUnsafe: {
                //             user: mockUser,
                //             auth_date: Math.floor(Date.now() / 1000),
                //             hash: 'mock-hash'
                //         }
                //     };

                //     setTg(mockTg);
                //     setIsLoading(false);
                //     return;
                // }

                // 3. Реальный режим работы в Telegram
                if (!isTelegramWebView) {
                    setError(new Error('Telegram WebApp not detected'));
                    setIsLoading(false);
                    return;
                }

                const webApp = window.Telegram.WebApp;

                const handleReady = () => {
                    try {
                        webApp.expand(); // Раскрываем на весь экран
                        
                        setTg({
                            ...webApp,
                            initDataUnsafe: {
                                user: webApp.initDataUnsafe?.user,
                                auth_date: webApp.initDataUnsafe?.auth_date,
                                hash: webApp.initDataUnsafe?.hash
                            }
                        });
                        
                        setIsLoading(false);
                    } catch (e) {
                        setError(e as Error);
                        setIsLoading(false);
                    }
                };

                // Разные стратегии инициализации для разных версий WebApp
                if (webApp.onEvent) {
                    webApp.onEvent('webAppReady', handleReady);
                    webApp.ready();
                } else {
                    webApp.ready();
                    handleReady();
                }

                return () => {
                    if (webApp.offEvent) {
                        webApp.offEvent('webAppReady', handleReady);
                    }
                };

            } catch (e) {
                setError(e as Error);
                setIsLoading(false);
            }
        };

        // Более надёжная проверка загрузки Telegram SDK
        if (window.Telegram) {
            initTelegram();
        } else {
            const checkInterval = setInterval(() => {
                if (window.Telegram) {
                    clearInterval(checkInterval);
                    initTelegram();
                }
            }, 50);
            
            return () => clearInterval(checkInterval);
        }
    }, []);

    return {
        tg,
        isLoading,
        error,
        user: tg?.initDataUnsafe?.user,
        userId: tg?.initDataUnsafe?.user?.id
    };
};