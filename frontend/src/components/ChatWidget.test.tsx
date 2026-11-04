import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { CartProvider } from '../context/CartContext';
import {
  ApiError,
  getProductById,
  getProducts,
  sendChatMessage,
} from '../services/api';
import type { Product } from '../types';
import ChatWidget from './ChatWidget';

// Nunca sale a la red: se reemplazan todas las funciones de la API que usan
// el widget y las páginas del Layout. ApiError queda el real.
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    sendChatMessage: vi.fn(),
    getProducts: vi.fn(),
    getProductById: vi.fn(),
    createOrder: vi.fn(),
  };
});

const WELCOME =
  '¡Hola! Soy KioscoBot. Puedo ayudarte con precios, stock, categorías, horarios y medios de pago. ¿Qué necesitás?';

const coca: Product = {
  id: 1,
  name: 'Coca-Cola 500ml',
  category: 'bebidas',
  price: 1200,
  stock: 25,
  description: null,
  image: null,
};

// Promesa que el test resuelve o rechaza cuando quiere.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderWidget() {
  const user = userEvent.setup();
  render(<ChatWidget />);
  return user;
}

function renderApp(path = '/') {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <CartProvider>
        <App />
      </CartProvider>
    </MemoryRouter>,
  );
  return user;
}

async function openChat(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: 'Abrir chat de KioscoBot' }),
  );
  return screen.getByRole('dialog', { name: 'KioscoBot' });
}

const input = () => screen.getByLabelText('Escribí tu pregunta');
const sendButton = () => screen.getByRole('button', { name: 'Enviar' });
const log = () => screen.getByRole('log');

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.mocked(sendChatMessage).mockReset();
    vi.mocked(getProducts).mockReset().mockResolvedValue([coca]);
    vi.mocked(getProductById).mockReset().mockResolvedValue(coca);
  });

  it('arranca cerrado, solo con el botón flotante', () => {
    renderWidget();
    expect(
      screen.getByRole('button', { name: 'Abrir chat de KioscoBot' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('al abrirlo muestra la bienvenida y pone el foco en el campo', async () => {
    const user = renderWidget();
    await openChat(user);
    expect(within(log()).getByText(WELCOME)).toBeInTheDocument();
    expect(input()).toHaveFocus();
  });

  it('no envía un mensaje vacío o con solo espacios', async () => {
    const user = renderWidget();
    await openChat(user);
    expect(sendButton()).toBeDisabled();

    await user.type(input(), '   {Enter}');
    expect(sendButton()).toBeDisabled();
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('envía con Enter y muestra el mensaje del usuario', async () => {
    vi.mocked(sendChatMessage).mockResolvedValue({ reply: 'Respuesta' });
    const user = renderWidget();
    await openChat(user);

    await user.type(input(), '  ¿Cuánto sale la Coca?  {Enter}');

    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(sendChatMessage).toHaveBeenCalledWith('¿Cuánto sale la Coca?');
    expect(within(log()).getByText('¿Cuánto sale la Coca?')).toBeVisible();
    expect(input()).toHaveValue('');
  });

  it('envía con el botón Enviar', async () => {
    vi.mocked(sendChatMessage).mockResolvedValue({ reply: 'Respuesta' });
    const user = renderWidget();
    await openChat(user);

    await user.type(input(), 'Hola');
    await user.click(sendButton());

    expect(sendChatMessage).toHaveBeenCalledWith('Hola');
    expect(within(log()).getByText('Hola')).toBeVisible();
  });

  it('mientras espera muestra "Escribiendo…" y deshabilita el envío', async () => {
    const pending = deferred<{ reply: string }>();
    vi.mocked(sendChatMessage).mockReturnValue(pending.promise);
    const user = renderWidget();
    await openChat(user);

    await user.type(input(), 'Hola{Enter}');

    expect(screen.getByRole('status')).toHaveTextContent('Escribiendo…');
    expect(input()).toBeDisabled();
    expect(sendButton()).toBeDisabled();

    pending.resolve({ reply: '¡Hola!' });
    expect(await within(log()).findByText('¡Hola!')).toBeVisible();
    expect(screen.queryByText('Escribiendo…')).not.toBeInTheDocument();
    expect(input()).toBeEnabled();
    await waitFor(() => expect(input()).toHaveFocus());
  });

  it('muestra la respuesta del bot respetando los saltos de línea', async () => {
    const reply =
      'En Bebidas tengo:\n- Coca-Cola 500ml: $ 1.200\n- Agua mineral 500ml: $ 800';
    vi.mocked(sendChatMessage).mockResolvedValue({ reply });
    const user = renderWidget();
    await openChat(user);

    await user.type(input(), '¿Qué bebidas tienen?{Enter}');

    const message = await within(log()).findByText(/En Bebidas tengo:/);
    // El texto llega con los \n intactos; el CSS (white-space: pre-line) los muestra.
    expect(message.textContent).toBe(`KioscoBot: ${reply}`);
  });

  it('si falla muestra el error en español y "Reintentar" manda el mismo mensaje', async () => {
    vi.mocked(sendChatMessage)
      .mockRejectedValueOnce(new ApiError(500, 'Internal server error'))
      .mockResolvedValueOnce({ reply: 'Ahora sí: $ 1.200' });
    const user = renderWidget();
    await openChat(user);

    await user.type(input(), '¿Cuánto sale la Coca?{Enter}');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'KioscoBot tuvo un problema para responder. Intentá de nuevo en un rato.',
    );
    expect(alert).not.toHaveTextContent('Internal server error');

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    expect(await within(log()).findByText('Ahora sí: $ 1.200')).toBeVisible();
    expect(sendChatMessage).toHaveBeenCalledTimes(2);
    expect(sendChatMessage).toHaveBeenNthCalledWith(2, '¿Cuánto sale la Coca?');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // El mensaje del usuario no se duplica al reintentar.
    expect(within(log()).getAllByText('¿Cuánto sale la Coca?')).toHaveLength(1);
  });

  it('sin conexión muestra el mensaje en español de api.ts', async () => {
    const networkMessage =
      'No se pudo conectar con el servidor. Revisá que el backend esté funcionando.';
    vi.mocked(sendChatMessage).mockRejectedValue(
      new ApiError(0, networkMessage, 'network'),
    );
    const user = renderWidget();
    await openChat(user);

    await user.type(input(), 'Hola{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(networkMessage);
  });

  it('respeta el tope de 500 caracteres', async () => {
    const user = renderWidget();
    await openChat(user);

    expect(input()).toHaveAttribute('maxLength', '500');
    await user.click(input());
    await user.paste('a'.repeat(520));
    expect(input()).toHaveValue('a'.repeat(500));
  });

  it('Escape cierra el chat y el foco vuelve al botón flotante', async () => {
    const user = renderWidget();
    await openChat(user);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Abrir chat de KioscoBot' }),
    ).toHaveFocus();
  });

  it('el botón "Cerrar chat" también lo cierra', async () => {
    const user = renderWidget();
    await openChat(user);
    await user.click(screen.getByRole('button', { name: 'Cerrar chat' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('conserva el historial al cerrar y volver a abrir', async () => {
    vi.mocked(sendChatMessage).mockResolvedValue({ reply: 'Respuesta 1' });
    const user = renderWidget();
    await openChat(user);
    await user.type(input(), 'Pregunta 1{Enter}');
    await within(log()).findByText('Respuesta 1');

    await user.keyboard('{Escape}');
    await openChat(user);

    expect(within(log()).getByText('Pregunta 1')).toBeVisible();
    expect(within(log()).getByText('Respuesta 1')).toBeVisible();
  });
});

describe('ChatWidget en el Layout', () => {
  beforeEach(() => {
    vi.mocked(sendChatMessage).mockReset();
    vi.mocked(getProducts).mockReset().mockResolvedValue([coca]);
    vi.mocked(getProductById).mockReset().mockResolvedValue(coca);
  });

  it.each(['/', '/products', '/products/1', '/cart', '/no-existe'])(
    'aparece en %s',
    (path) => {
      renderApp(path);
      expect(
        screen.getByRole('button', { name: 'Abrir chat de KioscoBot' }),
      ).toBeInTheDocument();
    },
  );

  it('conserva el historial al navegar entre páginas', async () => {
    vi.mocked(sendChatMessage).mockResolvedValue({ reply: 'Respuesta 1' });
    const user = renderApp('/');
    await openChat(user);
    await user.type(input(), 'Pregunta 1{Enter}');
    await within(log()).findByText('Respuesta 1');

    await user.click(screen.getByRole('link', { name: 'Productos' }));
    expect(
      await screen.findByRole('heading', { name: 'Productos', level: 1 }),
    ).toBeInTheDocument();

    expect(within(log()).getByText('Pregunta 1')).toBeVisible();
    expect(within(log()).getByText('Respuesta 1')).toBeVisible();
  });
});
