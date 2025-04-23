import React, { useState, useEffect } from 'react';
import { getContributedProcurementsForParticipant } from "../../../../api/endpoints/procurementEndpoints"
import './TabStyles.css';

const MyContributionsTab = ({ participantId }) => {
  const [contributions, setContributions] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!participantId) return;

    const fetchContributions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getContributedProcurementsForParticipant(participantId);
        console.log("Received data:", data);
        setContributions(data);

        const total = data.reduce((sum, purchase) => sum + (purchase.price || 0), 0);
        setTotalAmount(total);
      } catch (err) {
        setError("Ошибка загрузки данных");
        console.error("Ошибка при получении взносов:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContributions();
  }, [participantId]);

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h2>Мои взносы</h2>
      </div>

      {loading ? (
          <p>Загрузка...</p>
      ) : error ? (
          <p className="error">Ошибка: {error}</p>
      ) : contributions.length === 0 ? (
          <div className="empty-tab">
            <p>У вас пока нет взносов</p>
          </div>
      ) : (
        <div>
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Стоимость</th>
              </tr>
            </thead>
            <tbody>
            {contributions.map((contribution, index) => (
                <tr key={contribution.id}>
                  <td className="contribution-name">
                    <div 
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.3,
                      wordBreak: 'break-word'
                    }}>
                      {index + 1}. {contribution.name}</div>
                    {contribution.comment && (
                        <div 
                        className="secondary-text"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                          wordBreak: 'break-word'
                        }}
                        >{contribution.comment}</div>
                    )}
                  </td>
                  <td className="contribution-price">
                    {contribution.price ? `${contribution.price}\u00A0₽` : '—'}
                  </td>
                </tr>
            ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="total-row" colSpan={2}>
                  <strong>Итого:</strong> {totalAmount.toFixed(2)}&nbsp;руб.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyContributionsTab; 