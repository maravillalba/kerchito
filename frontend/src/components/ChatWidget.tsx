import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ApiError, sendChatMessage } from '../services/api';
import ErrorMessage from './ErrorMessage';
import Mascota from './Mascota';
import './ChatWidget.css';

interface ChatMessage {
  id: number;
  author: 'user' | 'bot';
  text: string;
}

const MAX_LENGTH = 500;

const WELCOME =
  '¡Hola! Soy KioscoBot. Puedo ayudarte con precios, stock, categorías, horarios y medios de pago. ¿Qué necesitás?';

// Convierte el error de la API en un texto en español para el usuario.
function messageFromError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'No se pudo enviar el mensaje. Intentá de nuevo.';
  }

  // timeout y network ya traen un mensaje en español desde api.ts.
  if (error.kind !== 'http') {
    return error.message;
  }

  if (error.status === 422) {
    return `El mensaje tiene que tener entre 1 y ${MAX_LENGTH} caracteres.`;
  }
  return 'KioscoBot tuvo un problema para responder. Intentá de nuevo en un rato.';
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  // El historial vive en el estado: se conserva al navegar y se pierde al recargar.
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, author: 'bot', text: WELCOME },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mensaje que falló, para que "Reintentar" lo vuelva a mandar.
  const [failedMessage, setFailedMessage] = useState<string | null>(null);

  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Al abrir, el foco va al campo de texto; al cerrar, vuelve al botón flotante.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else if (wasOpen.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  // Al terminar de esperar la respuesta, el campo vuelve a estar habilitado.
  useEffect(() => {
    if (open && !sending) {
      inputRef.current?.focus();
    }
  }, [open, sending]);

  // Scroll automático al último mensaje.
  useEffect(() => {
    const log = logRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages, sending, error, open]);

  const addMessage = (author: ChatMessage['author'], text: string) => {
    const id = nextId.current++;
    setMessages((prev) => [...prev, { id, author, text }]);
  };

  const ask = async (message: string) => {
    setSending(true);
    setError(null);
    setFailedMessage(null);
    try {
      const { reply } = await sendChatMessage(message);
      addMessage('bot', reply);
    } catch (err) {
      setError(messageFromError(err));
      setFailedMessage(message);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) {
      return;
    }
    addMessage('user', message);
    setDraft('');
    void ask(message);
  };

  const handleRetry = () => {
    if (failedMessage && !sending) {
      void ask(failedMessage);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        ref={toggleRef}
        type="button"
        className="chat-widget__toggle"
        aria-label="Abrir chat de KioscoBot"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">💬</span>
      </button>
    );
  }

  return (
    <div
      className="chat-widget__panel"
      role="dialog"
      aria-labelledby="chat-widget-title"
      onKeyDown={handleKeyDown}
    >
      <div className="chat-widget__header">
        <h2 id="chat-widget-title" className="chat-widget__title">
          KioscoBot
        </h2>
        <button
          type="button"
          className="chat-widget__close"
          aria-label="Cerrar chat"
          onClick={() => setOpen(false)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div
        ref={logRef}
        className="chat-widget__log"
        role="log"
        aria-live="polite"
      >
        {messages.map((message) => (
          <p
            key={message.id}
            className={`chat-widget__message chat-widget__message--${message.author}`}
          >
            <span className="chat-widget__sr-only">
              {message.author === 'user' ? 'Vos: ' : 'KioscoBot: '}
            </span>
            {message.text}
          </p>
        ))}
        {sending && (
          <div className="chat-widget__thinking">
            <Mascota pose="pensando" size="chico" />
            <p className="chat-widget__typing" role="status" aria-live="polite">
              Escribiendo…
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="chat-widget__error">
          <Mascota pose="triste" size="chico" />
          <ErrorMessage message={error} onRetry={handleRetry} />
        </div>
      )}

      <form className="chat-widget__form" onSubmit={handleSubmit}>
        <label htmlFor="chat-widget-input" className="chat-widget__sr-only">
          Escribí tu pregunta
        </label>
        <input
          ref={inputRef}
          id="chat-widget-input"
          className="chat-widget__input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_LENGTH}
          placeholder="Escribí tu pregunta"
          autoComplete="off"
          disabled={sending}
        />
        <button
          type="submit"
          className="chat-widget__send"
          disabled={sending || draft.trim() === ''}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

export default ChatWidget;
