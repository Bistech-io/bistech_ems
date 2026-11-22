import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { LoginForm } from '@/features/auth/components/login-form';
import { getErrorMessageForCode } from '@/lib/api/errors';
import { authHandlers, resetMockSessionState } from '@/mocks/handlers';
import { DEV_PASSWORD, MOCK_ACCOUNTS } from '@/mocks/scenarios';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';

const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockSessionState();
  replaceMock.mockReset();
  refreshMock.mockReset();
});
afterAll(() => server.close());

function renderLoginForm(nextPath?: string) {
  return render(
    <QueryProvider>
      <AuthProvider>
        <LoginForm nextPath={nextPath} />
      </AuthProvider>
    </QueryProvider>,
  );
}

describe('LoginForm', () => {
  it('validates empty/invalid fields client-side with accessible errors', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('renders mapped error messages for INVALID_CREDENTIALS, ACCOUNT_LOCKED, RATE_LIMITED, and VALIDATION_ERROR', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    // 1. Wrong password -> INVALID_CREDENTIALS
    await user.type(usernameInput, MOCK_ACCOUNTS.admin);
    await user.type(passwordInput, 'WrongPassword!');
    await user.click(submitBtn);
    expect(await screen.findByText(getErrorMessageForCode('INVALID_CREDENTIALS'))).toBeInTheDocument();

    // 2. Locked account -> ACCOUNT_LOCKED
    await user.clear(usernameInput);
    await user.type(usernameInput, MOCK_ACCOUNTS.locked);
    await user.click(submitBtn);
    expect(await screen.findByText(getErrorMessageForCode('ACCOUNT_LOCKED'))).toBeInTheDocument();

    // 3. Rate limited -> RATE_LIMITED
    await user.clear(usernameInput);
    await user.type(usernameInput, MOCK_ACCOUNTS.rateLimited);
    await user.click(submitBtn);
    expect(await screen.findByText(getErrorMessageForCode('RATE_LIMITED'))).toBeInTheDocument();

    // 4. Server field validation -> VALIDATION_ERROR mapped to username field
    await user.clear(usernameInput);
    await user.type(usernameInput, MOCK_ACCOUNTS.validationError);
    await user.click(submitBtn);
    expect(
      await screen.findByText(/this username is not allowed for this workspace/i),
    ).toBeInTheDocument();
  });

  it('submits valid credentials and redirects to safe nextPath or /dashboard', async () => {
    const user = userEvent.setup();
    renderLoginForm('/employees');

    await user.type(screen.getByLabelText(/username/i), MOCK_ACCOUNTS.admin);
    await user.type(screen.getByLabelText(/^password$/i), DEV_PASSWORD);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/employees');
    });
  });

  it('fills demo credentials when clicking a quick demo role button', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /hr manager/i }));

    expect(screen.getByLabelText(/username/i)).toHaveValue('hr');
    expect(screen.getByLabelText(/^password$/i)).toHaveValue('Password123!');
    expect(screen.queryByText(/must be at least 3 characters/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /dept head/i }));

    expect(screen.getByLabelText(/username/i)).toHaveValue('head');
    expect(screen.getByLabelText(/^password$/i)).toHaveValue('Password123!');
  });
});
