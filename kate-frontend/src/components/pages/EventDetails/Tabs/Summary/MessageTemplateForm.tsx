import React, {useEffect, useState} from 'react';
import './SummaryTab.css';

const MessageTemplateForm = ({ paymentDetails, setPaymentDetails, handleUpdateEvent }) => {
  const [localPaymentDetails, setLocalPaymentDetails] = useState(paymentDetails || '');
  const maxLength = 80;

  useEffect(() => {
    setLocalPaymentDetails(paymentDetails || '');
  }, [paymentDetails]); // Обновляем локальное состояние при изменении paymentDetails

  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setLocalPaymentDetails(value);
      setPaymentDetails(value);
    }
  };

  return (
    <div className="template-form-container">
      <div>
        <h3>Ваши реквизиты для перевода</h3>
        <div className="textarea-container">
          <textarea
            value={localPaymentDetails}
            onChange={handleChange}
            placeholder="Введите реквизиты, чтобы участники знали, куда переводить"
            className="payment-details-textarea"
            maxLength={maxLength}
          />
          <div className="char-counter">
            {localPaymentDetails.length}/{maxLength}
          </div>
        </div>
        <button className="button save-button" onClick={handleUpdateEvent}>
          Сохранить реквизиты
        </button>
      </div>
    </div>
  );
};

export default MessageTemplateForm;
