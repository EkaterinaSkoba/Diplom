import React, {useState, useEffect, MouseEventHandler} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './TabStyles.css';
import {UUID} from "node:crypto";
import {useTelegramAuth} from "../../../../context/TelegramAuthContext";
import Procurement, {CompletionStatus, FundraisingStatus} from "../../../../model/Procurement";
import EventEntity from "../../../../model/EventEntity";
import {
  deleteProcurement,
  getEventProcurements,
  getProcurementById,
  updateProcurement
} from "../../../../api/endpoints/procurementEndpoints";
import Participant from "../../../../model/Participant";
import {getEventParticipants} from "../../../../api/endpoints/participantsEndpoints";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Box,
  Tooltip
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

interface PurchasesProps {
  event: EventEntity;
  onAddPurchase: MouseEventHandler<HTMLButtonElement>;
}

const PurchasesTab = (props: PurchasesProps) => {
  const eventId: UUID = (useParams()).eventId as UUID;
  const event: EventEntity = props.event;
  const onAddPurchase = props.onAddPurchase;

  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Procurement[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [budgetDifference, setBudgetDifference] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const { user } = useTelegramAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);

  async function loadProcurements() {
    if (event && event) {
      const procurements = await getEventProcurements(event.id);
      setPurchases(procurements);

      const participantsData = await getEventParticipants(event.id) as Participant[];
      setParticipants(participantsData);

      // Расчет общей суммы
      const total = procurements.reduce((sum, purchase) =>
          sum + (purchase.price ? purchase.price : 0), 0);
      setTotalAmount(total);

      // Расчет разницы с бюджетом, если бюджет указан
      if (event.budget) {
        setBudgetDifference(event.budget - total);
      }
    }
  }

  useEffect(() => {
    loadProcurements();
  }, [event]);

  const handleEditPurchase = (purchaseId, e) => {
    e.stopPropagation();
    navigate(`/event/${eventId}/edit-purchase/${purchaseId}`);
  };

  const handleAddToContributors = async (purchaseId, e) => {
    e.stopPropagation();
    const purchase = await getProcurementById(purchaseId);
    if (!purchase) return;
  
    const eventParticipants = (await getEventParticipants(eventId)) as Participant[];
    const participant = eventParticipants.find(e => e.tgUserId === user.id);
    
    if (!participant) return; // Если участник не найден, выходим
  
    let newContributors = [];
  
    // Если contributors - массив, добавляем текущего участника
    if (Array.isArray(purchase.contributors)) {
      // Проверяем, не добавлен ли уже участник
      if (!purchase.contributors.includes(participant.id)) {
        newContributors = [...purchase.contributors, participant.id];
      } else {
        return; // Уже добавлен, ничего не делаем
      }
    } 
    // Если contributors - строка 'all', оставляем как есть
    else if (purchase.contributors === '') {
      return;
    } 
    // Иначе создаем массив с текущим участником
    else {
      newContributors = [participant.id];
    }
  
    // Обновляем закупку на сервере
    const updatedPurchase = {
      ...purchase,
      contributors: newContributors
    };
    
    await updateProcurement(eventId, purchaseId, updatedPurchase, participant.id);
    // Обновление состояния в UI
    setPurchases(prevPurchases => 
      prevPurchases.map(p => 
        p.id === purchaseId ? updatedPurchase : p
      )
    );
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getStatusText = (status: CompletionStatus): string => {
    switch (status) {
      case CompletionStatus.DONE:
        return '✅ Выполнено';
      case CompletionStatus.IN_PROGRESS:
        return '🔄 В процессе';
      default:
        return '⏳ Не начато';
    }
  };

  const getCollectionText = (collection: FundraisingStatus): string => {
    switch (collection) {
      case FundraisingStatus.NONE:
        return 'Не собирается';
      case FundraisingStatus.IN_PROGRESS:
        return 'Собирается';
      case FundraisingStatus.DONE:
        return 'Собрано';
      default:
        return 'Неизвестно';
    }
  };

  const getParticipantNameById = (id: UUID): string => {
    const foundParticipant = participants.find(p => p.id === id);
    return foundParticipant?.name;
  };

  const isUserContributor = (purchase) => {
    if (purchase.contributors === 'all') return true;
    if (Array.isArray(purchase.contributors)) {
      return purchase.contributors.includes('currentUser');
    }
    return false;
  };

  const sortedPurchases = [...purchases].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // Специальная сортировка для поля "Кто скидывается"
    if (sortConfig.key === 'contributors') {
      const aIsAll = aValue === 'all';
      const bIsAll = bValue === 'all';
      const aHasCurrentUser = aValue && (aValue === 'all' || (Array.isArray(aValue) && aValue.includes('currentUser')));
      const bHasCurrentUser = bValue && (bValue === 'all' || (Array.isArray(bValue) && bValue.includes('currentUser')));
      
      // Сначала "Все участники"
      if (aIsAll && !bIsAll) return -1;
      if (!aIsAll && bIsAll) return 1;
      
      // Затем записи с текущим пользователем
      if (aHasCurrentUser && !bHasCurrentUser) return -1;
      if (!aHasCurrentUser && bHasCurrentUser) return 1;
      
      return 0;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const renderSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
    }
    return null;
  };

  const getContributorsText = (contributors: UUID[]): string => {
    if (!contributors || contributors.length === 0) {
      return 'Все';
    }

    return contributors.map(id => getParticipantNameById(id)).join(', ');
  };

  // Выбор режима отображения в зависимости от ширины экрана (для мобильного вида)
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  async function handleDeletePurchase(purchaseId: UUID) {
    const confirmDelete = window.confirm("Вы уверены, что хотите удалить эту закупку?");
    if (!confirmDelete) return;

    await deleteProcurement(eventId, purchaseId);
    loadProcurements();
  }

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
      <div className="tab-container">
        <div className="tab-header">
          <h2>Список закупок</h2>
          <Button variant="contained" color="primary" onClick={onAddPurchase}>Добавить</Button>
        </div>

        {purchases.length === 0 ? (
            <div className="empty-tab">
              <p>Список закупок пуст</p>
              <Button variant="contained" color="primary" onClick={onAddPurchase}>Добавить закупку</Button>
            </div>
        ) : (
            isMobileView ? (
                <div className="purchases-mobile-view">
                  {purchases.map((purchase, index) => (
                      <Paper key={purchase.id} className="purchase-card" elevation={3} >
                        <Box p={0.5}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap">
                            <Box sx={{ 
                              flex: '1 1 60%', // Минимум 60% ширины, 
                              minWidth: 0, // Важно для обрезки текста
                              overflow: 'hidden',
                              pr: 1 // Отступ от кнопок
                            }}>
                              <strong style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.3,
                                wordBreak: 'break-word'
                              }}>
                                {index + 1}. {purchase.name}
                              </strong>
                              <p style={{ fontSize: '14px'}}>{getStatusText(purchase.completionStatus)}</p>
                            </Box>
                            <Box sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'flex-end'
                            }}>
                              <Button sx={{ minWidth: '36px', fontSize: '14px' }} onClick={(e) => handleEditPurchase(purchase.id, e)}>✎</Button>
                                {!isUserContributor(purchase) && (
                                    <Button sx={{ minWidth: '36px', fontSize: '14px'}} onClick={(e) => handleAddToContributors(purchase.id, e)}>+</Button>
                                )}
                              <Button sx={{ minWidth: '36px', fontSize: '14px' }} onClick={(e) => handleDeletePurchase(purchase.id)}>🗑️</Button>
                            </Box>
                          </Box>
                          <p style={{ fontSize: '14px'}}>Стоимость: {purchase.price ? `${purchase.price} руб.` : '—'}</p>
                          <p style={{ fontSize: '14px'}}>Ответственный: {getParticipantNameById(purchase.responsibleId)}</p>
                          <p style={{ fontSize: '14px'}}>Кто скидывается: {getContributorsText(purchase.contributors)}</p>
                        </Box>
                      </Paper>
                  ))}
                </div>
            ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Название</TableCell>
                        <TableCell>Стоимость</TableCell>
                        <TableCell>Ответственный</TableCell>
                        <TableCell>Кто скидывается</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell>Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchases.map((purchase, index) => (
                          <TableRow key={purchase.id}>
                            <TableCell>{index + 1}. {purchase.name}</TableCell>
                            <TableCell>{purchase.price ? `${purchase.price} руб.` : '—'}</TableCell>
                            <TableCell>{getParticipantNameById(purchase.responsibleId)}</TableCell>
                            <TableCell>
                              {purchase.contributors && purchase.contributors.length > 0 ? (
                                  <Box display="flex" flexWrap="wrap" gap={1}>
                                    {purchase.contributors.map((value) => (
                                        <Chip key={value} label={getParticipantNameById(value)} />
                                    ))}
                                  </Box>
                              ) : 'Никто не скидывается'}
                            </TableCell>
                            <TableCell>{getStatusText(purchase.completionStatus)}</TableCell>
                            <TableCell>
                              <Tooltip title="Редактировать">
                                <Button size="small" onClick={(e) => handleEditPurchase(purchase.id, e)}>✎</Button>
                              </Tooltip>
                              {!isUserContributor(purchase) && (
                                  <Tooltip title="Добавить себя в список скидывающихся">
                                    <Button size="small" onClick={(e) => handleAddToContributors(purchase.id, e)}>+</Button>
                                  </Tooltip>
                              )}
                              <Tooltip title="Удалить">
                                <Button size="small" onClick={() => handleDeletePurchase(purchase.id)}>🗑️</Button>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
            )
        )}
      </div>
  );
};

export default PurchasesTab; 