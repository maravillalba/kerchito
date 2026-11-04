import './Loading.css';

interface LoadingProps {
  message?: string;
}

function Loading({ message = 'Cargando…' }: LoadingProps) {
  return (
    <div className="loading" role="status">
      <span className="loading__spinner" aria-hidden="true" />
      <p className="loading__message">{message}</p>
    </div>
  );
}

export default Loading;
