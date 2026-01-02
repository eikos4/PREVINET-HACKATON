import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
  stack: string;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
    stack: "",
  };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    const stack = error instanceof Error ? error.stack ?? "" : "";
    this.setState({ stack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "1.5rem", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 0.75rem 0", color: "#0f172a" }}>Error de aplicación</h2>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "1rem",
                boxShadow: "0 2px 8px rgba(0,0,0,.06)",
              }}
            >
              <div style={{ fontWeight: 800, color: "#b91c1c", marginBottom: "0.5rem" }}>
                {this.state.message}
              </div>
              {this.state.stack && (
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    color: "#334155",
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {this.state.stack}
                </pre>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  marginTop: 12,
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "0.6rem 1rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Recargar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
