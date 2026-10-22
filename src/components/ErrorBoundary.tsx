import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/**
 * Last line of defence: without this a render error unmounts the whole tree and
 * the player just sees a blank page.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // keep the detail available for debugging
    (window as unknown as { __magictdLastError?: string }).__magictdLastError =
      `${error.message}\n${info.componentStack ?? ""}`;
    console.error("MagicTD crashed:", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="app-bg flex h-full items-center justify-center p-6">
        <div className="panel anim-pop w-full max-w-xl p-6 text-center">
          <div className="font-disp text-3xl text-[#ff4d5e]">Something broke</div>
          <p className="mt-2 text-[15px] font-semibold text-[var(--dim)]">
            The game hit an unexpected error. Your progress is saved in this browser.
          </p>
          <pre className="scroll-thin mt-3 max-h-40 overflow-auto rounded-lg border border-[var(--line)] bg-black/40 p-3 text-left text-[12px] leading-snug text-[#ff8f9a]">
            {error.message}
          </pre>
          <div className="mt-4 flex justify-center gap-3">
            <button className="btn btn-gold px-5 py-2" onClick={() => this.setState({ error: null })}>
              Try Again
            </button>
            <button className="btn px-5 py-2" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
