import KerButton from './KerButton';
import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <p className="error-message__text">{message}</p>
      {onRetry && (
        <KerButton className="error-message__retry" onClick={onRetry}>
          Reintentar
        </KerButton>
      )}
    </div>
  );
}

export default ErrorMessage;
