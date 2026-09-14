import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Error Boundary para capturar errores de React
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ [ERROR BOUNDARY] Error capturado:', error);
    console.error('❌ [ERROR BOUNDARY] Información del error:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#131009',
          color: '#f3e9d4',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ maxWidth: '600px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#e4603f' }}>
              ⚠️ Error de la Aplicación
            </h1>
            <p style={{ marginBottom: '1rem', color: '#a3906a' }}>
              La aplicación encontró un error inesperado.
            </p>
            <div style={{
              backgroundColor: '#1b140c',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              textAlign: 'left',
              border: '1px solid #392c19'
            }}>
              <p style={{ color: '#e4603f', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Error:
              </p>
              <pre style={{ 
                color: '#f3e9d4', 
                fontSize: '0.875rem', 
                overflow: 'auto',
                margin: 0
              }}>
                {this.state.error?.message || 'Error desconocido'}
              </pre>
            </div>
            <div style={{
              backgroundColor: '#1b140c',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              textAlign: 'left',
              border: '1px solid #392c19'
            }}>
              <p style={{ color: '#f0a41c', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                💡 Posibles soluciones:
              </p>
              <ul style={{ color: '#a3906a', textAlign: 'left', paddingLeft: '1.5rem' }}>
                <li>Verifica que las variables de entorno estén configuradas en el archivo .env</li>
                <li>Ejecuta <code style={{ backgroundColor: '#2d2214', padding: '2px 6px', borderRadius: '4px' }}>npm run dev</code> nuevamente</li>
                <li>Revisa la consola del navegador (F12) para más detalles</li>
                <li>Consulta el archivo .env.example para ver las variables requeridas</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#f0a41c',
                color: '#131009',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Envolver la app con Error Boundary
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
