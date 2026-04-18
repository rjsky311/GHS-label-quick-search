import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Jest's default error logger spams the test output when a component
// throws; silence it while we're deliberately triggering errors.
let originalConsoleError;
beforeEach(() => {
  originalConsoleError = console.error;
  console.error = jest.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

function Thrower({ shouldThrow = true, message = 'boom' }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="child">ok</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByText('error.title')).not.toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );

    // i18n mock returns keys verbatim
    expect(screen.getByText('error.title')).toBeInTheDocument();
    expect(screen.getByText('error.message')).toBeInTheDocument();
    expect(screen.getByText('error.reload')).toBeInTheDocument();
  });

  it('logs the captured error via componentDidCatch', () => {
    render(
      <ErrorBoundary>
        <Thrower message="detonation" />
      </ErrorBoundary>
    );

    const logged = console.error.mock.calls
      .map((args) => args.map(String).join(' '))
      .join('\n');
    expect(logged).toMatch(/ErrorBoundary caught an error/);
    expect(logged).toMatch(/detonation/);
  });

  it('reload button triggers window.location.reload', () => {
    const reloadSpy = jest.fn();

    render(
      <ErrorBoundary onReload={reloadSpy}>
        <Thrower />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('error.reload'));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
