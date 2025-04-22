import React, {useState, useEffect, useCallback} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../common/Header';
import Tabs from '../../common/Tabs';
import PurchasesTab from './Tabs/PurchasesTab';
import MyContributionsTab from './Tabs/MyContributionsTab';
import MyTasksTab from './Tabs/MyTasksTab';
import ParticipantsTab from './Tabs/ParticipantsTab';
import SummaryTab from './Tabs/SummaryTab';
import './EventDetails.css';
import {UUID} from "node:crypto";
import EventEntity from "../../../model/EventEntity";
import {useTelegramAuth} from "../../../context/TelegramAuthContext";
import {getEventById} from "../../../api/endpoints/eventEndpoints";
import {getParticipantByUserIdAndEventId} from "../../../api/endpoints/participantsEndpoints";
import Participant from "../../../model/Participant"
import ApiErrorResponse from "../../../model/ApiErrorResponse";


const EventDetails = () => {
  const { eventId } = useParams<{ eventId: UUID }>();
  const navigate = useNavigate();
  const { user } = useTelegramAuth();

  const [event, setEvent] = useState<EventEntity | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('purchases');
  const [loading, setLoading] = useState<boolean>(true);

  const isCurrentUserOrganizer = () => event?.organizerTgUserId === user?.id;

  /**
   * Запрашивает ID участника по userId и eventId
   */
  const fetchParticipantId = useCallback(async () => {
    try {
      if (!user || !eventId) return;
      const participant = await getParticipantByUserIdAndEventId(user.id, eventId);
      if (typeof participant === 'string') {
        setParticipantId(participant); // Просто сохраняем строку (ID)
      } else if (typeof participant === 'object' && participant !== null && 'error' in participant) {
        console.error('Ошибка при получении participantId:', participant.error);
      } else {
        console.error('Неожиданный ответ от API:', participant);
      }
    } catch (error) {
      console.error('Ошибка при запросе participantId:', error);
    }
  }, [user, eventId]);

  useEffect(() => {
    const loadEvent = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      try {
        const eventData = await getEventById(user.id, eventId);
        if (eventData) {
          setEvent(eventData);
          fetchParticipantId();
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error(error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadEvent();
  }, [user, eventId, fetchParticipantId, navigate]);


  const handleEditEvent = () => {
    navigate(`/event/${eventId}/edit`);
  };

  const handleAddPurchase = () => {
    navigate(`/event/${eventId}/add-purchase`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Дата не указана';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTabs = () => {
    const tabs = [
      { id: 'purchases', label: 'Закупки' },
      { id: 'contributions', label: 'Взносы' },
      { id: 'tasks', label: 'Задачи' },
      { id: 'participants', label: 'Участники' },
    ];
    // Вкладка "Итоги" доступна только организатору
    if (isCurrentUserOrganizer()) {
      tabs.push({ id: 'summary', label: 'Итоги' });
    }

    return tabs;
  };

  const renderTabContent = () => {
    if (!event) return null;

    switch (activeTab) {
      case 'purchases':
        return <PurchasesTab event={event} onAddPurchase={handleAddPurchase} />;
      case 'contributions':
        return participantId ? <MyContributionsTab participantId={participantId} /> : <p>Загрузка...</p>;
      case 'tasks':
        return <MyTasksTab event={event} />;
      case 'participants':
        return <ParticipantsTab event={event} />;
      case 'summary':
        return isCurrentUserOrganizer() ? <SummaryTab event={event} /> : null;
      default:
        return <PurchasesTab event={event} onAddPurchase={handleAddPurchase} />;
    }
  };

  if (loading) { return <div className="loading">Загрузка...</div>; }

  if (!event) { return <div className="error">Мероприятие не найдено</div>; }

  return (
    <div className="event-details-container">
      <Header 
        title={event.name}
        showBackButton={true}
        actionButton={
          isCurrentUserOrganizer() && (
            <button className="button secondary" onClick={handleEditEvent}>
              Редактировать
            </button>
          )
        }
      />

      <div className="event-summary">
        <div className="event-info">
          <p className="event-date">
            <span className="event-label">Дата:</span> {formatDate(event.date.toString())}
          </p>
          {event.place && (
            <p className="event-location">
              <span className="event-label">Место:</span> {event.place}
            </p>
          )}
          {event.budget > 0 && (
            <p className="event-budget">
              <span className="event-label">Бюджет:</span> {event.budget} руб.
            </p>
          )}
          {event.comment && (
            <p className="event-note event-comment">
              <span className="event-label">Примечание:</span> {event.comment}
            </p>
          )}
          <p className="event-status">
            <span className={`status-badge ${isCurrentUserOrganizer() ? 'organizer' : 'participant'}`}>
              {isCurrentUserOrganizer() ? 'Организатор' : 'Участник'}
            </span>
          </p>
        </div>
      </div>

      <Tabs 
        tabs={getTabs()}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default EventDetails; 