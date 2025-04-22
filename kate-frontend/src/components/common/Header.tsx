import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
    title: string;
    showBackButton?: boolean;
    actionButton?: React.ReactNode;
    customBackPath?: string;
    onBackClick?: () => void;
}

const Header = (props: HeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (props.onBackClick) {
      props.onBackClick();
    } else if (props.customBackPath) {
      navigate(props.customBackPath);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        {props.showBackButton && (
          <button className="back-button" onClick={handleBack}>
            ←
          </button>
        )}
        <h1 className="header-title">{props.title}</h1>
      </div>
      {props.actionButton && (
        <div className="header-right">
          {props.actionButton}
        </div>
      )}
    </header>
  );
};

export default Header; 