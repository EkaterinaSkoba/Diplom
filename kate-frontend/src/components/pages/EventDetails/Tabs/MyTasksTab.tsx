import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './TabStyles.css';
import {UUID} from "node:crypto";
import {useTelegramAuth} from "../../../../context/TelegramAuthContext";
import {
  getAssignedProcurementsForParticipant,
  getProcurementById,
  updateProcurement
} from "../../../../api/endpoints/procurementEndpoints";
import Procurement, {CompletionStatus} from "../../../../model/Procurement";
import {getEventParticipants} from "../../../../api/endpoints/participantsEndpoints";
import Participant from "../../../../model/Participant";
import {MenuItem, Select} from "@mui/material";

const MyTasksTab = ({ event }) => {
  const eventId: UUID = (useParams()).eventId as UUID;
  const [tasks, setTasks] = useState<Procurement[]>([]);
  const { user } = useTelegramAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<UUID | null>(null);
  const [inputValues, setInputValues] = useState({});

  useEffect(() => {
    async function fetchParticipants() {
      const eventParticipants = await getEventParticipants(eventId);
      if (Array.isArray(eventParticipants)) {
        setParticipants(eventParticipants);
        const currentUser = eventParticipants.find(p => p.tgUserId === user.id);
        if (currentUser) {
          setSelectedParticipantId(currentUser.id);
          loadTasks(currentUser.id);
        }
      }
    }
    fetchParticipants();
  }, [eventId]);

  // Функция для форматирования числа для отображения (с двумя знаками после запятой)
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return '';
    if (price === 0) return '0';
    
    // Форматируем число с двумя знаками после запятой
    return price.toFixed(2).replace(/\.00$/, ''); // Убираем .00 если нет копеек
  };

  async function loadTasks(participantId: UUID | null) {
    if (!participantId) return;
    const userTasks = await getAssignedProcurementsForParticipant(participantId);
    setTasks(userTasks || []);
    
    // Инициализируем локальные значения полей ввода из полученных данных
    const newInputValues = {};
    userTasks.forEach(task => {
      // Используем функцию форматирования для отображения цен
      newInputValues[task.id] = formatPrice(task.price);
    });
    setInputValues(newInputValues);
  }

  useEffect(() => {
    if (selectedParticipantId) {
      loadTasks(selectedParticipantId);
    }
  }, [selectedParticipantId]);
 
  const handleParticipantChange = (event) => {
    const newParticipantId = event.target.value;
    setSelectedParticipantId(newParticipantId);
    loadTasks(newParticipantId); // Загружаем задачи для нового участника сразу
  };

  const handleTaskStatusChange = async (taskId: UUID, newStatus: CompletionStatus) => {
    let procurementToUpdate = await getProcurementById(taskId);
    procurementToUpdate.completionStatus = newStatus;
    await updateProcurement(eventId, taskId, procurementToUpdate, selectedParticipantId);
    loadTasks(selectedParticipantId);
  };

  const handleCostChange = async (taskId: UUID, newCostString: string) => {
    const normalized = newCostString.replace(',', '.');
    if (normalized === '') return;
    
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      // Получаем актуальные данные о закупке
      let procurementToUpdate = await getProcurementById(taskId);
      
      // Обновляем цену
      procurementToUpdate.price = parsed;
      
      // Автоматически меняем статус на "Выполнено" при указании стоимости
      procurementToUpdate.completionStatus = CompletionStatus.DONE;
      
      // Обновляем локальное состояние
      setTasks((prevTasks) => 
        prevTasks.map((task) =>
          task.id === taskId ? { 
            ...task, 
            price: parsed,
            completionStatus: CompletionStatus.DONE
          } : task
        )
      );

      // Отправляем данные на сервер с правильным порядком аргументов
      await updateProcurement(eventId, taskId, procurementToUpdate, selectedParticipantId);
    }
  };

  // Функция для обработки локального изменения поля ввода
  const handleInputChange = (taskId: UUID, value: string) => {
    // Если поле было "0" и пользователь вводит цифру, заменяем "0" на новую цифру
    if (inputValues[taskId] === '0' && /^[1-9]$/.test(value)) {
      setInputValues(prev => ({
        ...prev,
        [taskId]: value
      }));
      // Сохраняем изменения после замены нуля
      handleCostChange(taskId, value);
      return;
    }
    
    // Проверяем, что строка содержит только цифры, возможно один разделитель (точку или запятую)
    // и не более двух цифр после разделителя
    const regex = /^$|^0$|^[1-9][0-9]*[.,]?[0-9]{0,2}$/;
    
    if (regex.test(value)) {
      // Обновляем локальное значение поля
      setInputValues(prev => ({
        ...prev,
        [taskId]: value
      }));
      
      // Если значение не пустое, сразу сохраняем
      if (value !== '') {
        handleCostChange(taskId, value);
      }
      // Если значение пустое, сохраняем 0
      else {
        handleCostChange(taskId, '0');
      }
    }
  };

  return (
      <div className="tab-container">
        <div className="tab-header">
          <h2>Задачи</h2>
          <Select value={selectedParticipantId || ''} onChange={handleParticipantChange}>
            {participants.map(participant => (
                <MenuItem key={participant.id} value={participant.id}>
                  {participant.name || 'Без имени'}
                </MenuItem>
            ))}
          </Select>
        </div>

        {!tasks || tasks.length === 0 ? (
            <div className="empty-tab">
              <p>Задач нет</p>
            </div>
        ) : (
            <div className="table-container my-tasks-table">
              <table>
                <thead>
                <tr>
                  <th>Задача</th>
                  <th>Стоимость</th>
                  <th>Статус</th>
                </tr>
                </thead>
                <tbody>
                {tasks.map((task, index) => (
                    <tr key={task.id}>
                      <td >
                        <div style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.3,
                                wordBreak: 'break-word'
                              }}>
                                {index + 1}. {task.name}
                        </div>
                        {task.comment && <div 
                        className="secondary-text"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                          wordBreak: 'break-word'
                        }}>{task.comment}</div>}
                      </td>
                      <td>
                        <input
                            type="text"
                            inputMode="decimal" // показывает числовую клавиатуру на мобильных
                            value={inputValues[task.id] || ''}  // Отображаем стоимость из состояния
                            onChange={(e) => handleInputChange(task.id, e.target.value)} // Обработчик изменения
                            placeholder="Укажите стоимость"
                            min = "0"
                            className="cost-input"
                            onWheel={(e) => e.currentTarget.blur()} // Убираем прокрутку колёсиком
                        />
                      </td>
                      
                      <td>
                      <Select
                          value={task.completionStatus}
                          onChange={(e) => handleTaskStatusChange(task.id, e.target.value as CompletionStatus)}
                          sx={{

                            // Стили для уменьшения высоты и текста
                            height: '36px', // Стандартная высота ~48px
                            fontSize: '14px', // Размер текста (по умолчанию 16px)

                            // Общие стили для Select (рамка + фон + текст)
                            backgroundColor: task.completionStatus === CompletionStatus.DONE ? "#e6f7d9" : "#f0ebff",
                            color: task.completionStatus === CompletionStatus.DONE ? "#71c017" : "#331bab",
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: task.completionStatus === CompletionStatus.DONE ? "#71c017" : "#331bab",
                            },
                            // Стиль при наведении
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: task.completionStatus === CompletionStatus.DONE ? "#5aa00e" : "#1a0a8a",
                            },
                            // Уменьшаем внутренние отступы (padding)
                            "& .MuiSelect-select": {
                              padding: '0px 0px 0px 10px', // Формат: верх право низ лево
                            },
                          }}
                        >
                          <MenuItem 
                            value={CompletionStatus.IN_PROGRESS}
                            sx={{ color: "#331bab" }} // Цвет текста в выпадающем списке
                          >
                            В процессе
                          </MenuItem>
                          <MenuItem 
                            value={CompletionStatus.DONE}
                            sx={{ color: "#71c017" }} // Цвет текста в выпадающем списке
                          >
                            Выполнено
                          </MenuItem>
                        </Select>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
        )}
      </div>
  );
};

export default MyTasksTab; 