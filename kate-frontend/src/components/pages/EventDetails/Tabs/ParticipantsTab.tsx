import React, {useCallback, useEffect, useState} from 'react';
import { useParams } from 'react-router-dom';
import './TabStyles.css';
import {UUID} from "node:crypto";
import { useTelegramAuth } from "../../../../context/TelegramAuthContext";
import Participant from "../../../../model/Participant";
import {
  changeEventOrganizer,
  deleteParticipantById,
  getEventParticipants
} from "../../../../api/endpoints/participantsEndpoints";
import ApiErrorResponse from "../../../../model/ApiErrorResponse";
import EventEntity from "../../../../model/EventEntity";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import {getEventInviteLink} from "../../../../api/endpoints/eventEndpoints";


interface ParticipantItemProps {
  event: EventEntity;
}

const ParticipantsTab = ({event}: ParticipantItemProps) => {
  const {eventId} = useParams<{ eventId: UUID }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const {user} = useTelegramAuth();
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const loadParticipants = useCallback(async () => {
    const participants = await getEventParticipants(eventId);
    if (!participants || participants instanceof ApiErrorResponse) {
      console.error('Ошибка при получении участников мероприятия');
      return;
    }
    setParticipants(participants);
    const link = await getEventInviteLink(user.id, eventId);
    setInviteLink(link);
  }, [eventId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const isCurrentUserOrganizer = () => event.organizerTgUserId === user.id;

  const handleRemoveParticipant = async (participantId: UUID) => {
    if (window.confirm('Вы уверены, что хотите удалить этого участника?')) {
      await deleteParticipantById(participantId);
      await loadParticipants();
    }
  };

  const handleAssignOrganizer = async (participantTgId: number) => {
    if (window.confirm('Назначить этого участника организатором? Вы останетесь участником, но потеряете права организатора.')) {
      await changeEventOrganizer(user.id, eventId, participantTgId);
      window.location.reload();
    }
  };

  const copyInviteLink = async () => {
    const link = await getEventInviteLink(user.id, eventId);
    navigator.clipboard.writeText(link)
        .then(() => {
          alert('Ссылка-приглашение скопирована в буфер обмена');
        })
        .catch(err => {
          console.error('Не удалось скопировать ссылку: ', err);
        });
  };

  return (
      <div>
        <h3>Пригласить участников</h3>
        <p>Поделитесь ссылкой, чтобы пригласить новых участников в мероприятие.</p>
        <div style={{marginBottom: "10px"}}>
          <input className="invite-link-input" type="text" value={inviteLink} readOnly
                 style={{width: '80%', marginRight: 10}}/>
          <Button variant="contained" onClick={copyInviteLink} >Копировать</Button>
        </div>

        <h2>Участники</h2>
        <p>👑 — Назначить организатором</p>
        <p>❌ — Удалить из мероприятия</p>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Участник</TableCell>
                <TableCell>Роль</TableCell>
                {isCurrentUserOrganizer() && <TableCell>Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {participants.map((participant, index) => (
                  <TableRow key={participant.id}>
                    <TableCell>{index + 1}. {participant.tgUserId === user.id ? 'Я' : (participant.name || 'Без имени')}</TableCell>
                    <TableCell>{participant.tgUserId === event.organizerTgUserId ? 'Организатор' : 'Участник'}</TableCell>
                    {isCurrentUserOrganizer() && participant.tgUserId !== user.id && (
                        <TableCell>
                          <div className='buttons-action-participants'>
                              <Button
                                  variant="outlined"
                                  onClick={() => handleAssignOrganizer(participant.tgUserId)}
                                  sx={{
                                    border: '2px solid #FFA500',
                                    '&:hover': {
                                      borderColor: '#FF8C00', // Темнее при наведении
                                      backgroundColor: 'rgba(255, 165, 0, 0.08)', // Легкий оранжевый при наведении
                                    },
                                  }}
                              >
                                👑
                              </Button>
                              <Button
                                  variant="outlined"
                                  onClick={() => handleRemoveParticipant(participant.id)}
                                  sx={{
                                    border: '2px solid #ff1e00',
                                    '&:hover': {
                                      borderColor: '#ce1800', // Темнее при наведении
                                      backgroundColor: 'rgba(255, 30, 0, 0.08)', // Легкий оранжевый при наведении
                                    },
                                  }}
                              >
                                ❌
                              </Button>
                          </div>
                        </TableCell>
                    )}
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
  );
};

export default ParticipantsTab; 