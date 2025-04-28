import React, { useState, useEffect } from 'react';
import {
    sendNotificationToParticipant,
    sendNotificationToUser
} from "../../../../../api/endpoints/notificationEndpoints";
import { useTelegramAuth } from "../../../../../context/TelegramAuthContext";
import EventEntity from "../../../../../model/EventEntity";
import IconTelegram from './IconTelegram.svg';
import IconCopy from './IconCopy.svg';
import './SummaryTab.css';

const ExpenseTable = ({ participantSummary, onPaymentStatusChange, currentParticipantId }) => {
    // Выбор режима отображения в зависимости от ширины экрана (для мобильного вида)
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

    const {user} = useTelegramAuth();

    // Обновляем состояние при изменении размера окна
    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const copyMessageToClipboard = (participant) => {
        if (!participant || !participant.notificationMessage) return;
        navigator.clipboard.writeText(participant.notificationMessage)
            .then(() => alert('Сообщение скопировано в буфер обмена'))
            .catch(err => console.error('Ошибка копирования: ', err));
    };

    const copyAmountToClipboard = (amount) => {
        // Берем абсолютное значение суммы и форматируем с двумя знаками после запятой, но без символа валюты
        const formattedAmount = Math.abs(amount).toFixed(2);
        navigator.clipboard.writeText(formattedAmount)
            .then(() => alert('Сумма скопирована в буфер обмена'))
            .catch(err => console.error('Ошибка копирования: ', err));
    };

    const sendMessageToTelegram = async (participant) => {
        if (!participant || !participant.notificationMessage || !participant.participantId) return;
        try {
            await sendNotificationToParticipant(participant.participantId, participant.notificationMessage);
            alert("Сообщение отправлено через бота!");
        } catch (error) {
            alert("Ошибка при отправке сообщения!");
            console.error(error);
        }
    };

    // Мобильный вид таблицы
    if (isMobileView) {
        return (
            <div className="table-container summary-table">
                <table className="mobile-summary-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Участники</th>
                            <th>Перевод</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participantSummary.map((participant) => {
                            const diff = participant.totalAmount || 0;

                            return (
                                <tr key={participant.participantId} className="participant-row">
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={!!participant.hasPayment}
                                            onChange={(e) => onPaymentStatusChange(participant.participantId, e.target.checked)}
                                        />
                                    </td>
                                    <td>
                                        <div className="participant-info">
                                            <div className="participant-name">{participant.tgUserId === user.id ? 'Я' : (participant.name || 'Без имени')}</div>
                                            <div className="participant-amounts">
                                                <p>Потрачено: {(participant.spentAmount || 0).toFixed(2)}&nbsp;₽</p>
                                                <p>Доля: {(participant.owedAmount || 0).toFixed(2)}&nbsp;₽</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="amount-with-copy mobile">
                                            <span className="transfer-amount">{(participant.totalAmount || 0).toFixed(2)}&nbsp;₽</span>
                                            {(participant.totalAmount < 0) && (
                                                <button 
                                                    className="icon-button small"
                                                    onClick={() => copyAmountToClipboard(participant.totalAmount)}
                                                    title="Копировать сумму"
                                                >
                                                    <img src={IconCopy} alt="Copy" className="copy-icon" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {participant.totalAmount > 0 && participant.participantId !== currentParticipantId && (
                                            <div className="transfer-actions mobile">
                                                <button className="icon-button" onClick={() => copyMessageToClipboard(participant)}>
                                                    <img src={IconCopy} alt="Copy" className="copy-icon" />
                                                </button>
                                                <button className="icon-button" onClick={() => sendMessageToTelegram(participant)}>
                                                    <img src={IconTelegram} alt="Telegram" className="telegram-icon" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    // Десктопный вид таблицы
    return (
        <div className="table-container summary-table">
            <table>
                <thead>
                <tr>
                    <th></th>
                    <th>Участник</th>
                    <th>Потрачено</th>
                    <th>Доля</th>
                    <th>Сумма перевода</th>
                    <th>Действия</th>
                </tr>
                </thead>
                <tbody>
                {participantSummary.map((participant) => {
                    const diff = participant.totalAmount || 0;

                    return (
                        <tr key={participant.participantId} className="participant-row">
                            <td>
                                <input
                                    type="checkbox"
                                    checked={!!participant.hasPayment}
                                    onChange={(e) => onPaymentStatusChange(participant.participantId, e.target.checked)}
                                />
                            </td>
                            <td> {participant.tgUserId === user.id ? 'Я' : (participant.name || 'Без имени')}</td>
                            <td>{(participant.spentAmount || 0).toFixed(2)}&nbsp;руб.</td>
                            <td>{(participant.owedAmount || 0).toFixed(2)}&nbsp;руб.</td>
                            <td>
                                <div className="amount-with-copy">
                                    {(participant.totalAmount || 0).toFixed(2)}&nbsp;руб.
                                    {(participant.totalAmount < 0) && (
                                        <button 
                                            className="icon-button small"
                                            onClick={() => copyAmountToClipboard(participant.totalAmount)}
                                            title="Копировать сумму"
                                        >
                                            <img src={IconCopy} alt="Copy" className="copy-icon" />
                                        </button>
                                    )}
                                </div>
                            </td>
                            <td>
                                {participant.totalAmount > 0 && participant.participantId !== currentParticipantId && (
                                    <div className="transfer-actions">
                                        <button className="button secondary" onClick={() => copyMessageToClipboard(participant)}>Копировать</button>
                                        <button className="button secondary" onClick={() => sendMessageToTelegram(participant)}>Telegram</button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
};
export default ExpenseTable;
