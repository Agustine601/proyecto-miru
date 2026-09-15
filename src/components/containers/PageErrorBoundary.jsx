import React from 'react';
import { Alert, Button, Card } from 'antd';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('MIRÚ: error en la pantalla:', error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.screenKey !== this.props.screenKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  volverInicio = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const errorMessage = this.state.error?.message || 'Error inesperado al cargar esta pantalla.';

    return (
      <Card style={{ width: '100%', maxWidth: 900, margin: '20px auto' }}>
        <Alert
          type="error"
          showIcon
          message="MIRÚ no pudo cargar esta pantalla"
          description={
            <div>
              <p>La aplicación sigue funcionando. Hubo un error solamente en esta sección.</p>
              <details style={{ marginBottom: 16 }}>
                <summary>Ver detalle técnico</summary>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{errorMessage}</pre>
              </details>
              <Button type="primary" onClick={this.volverInicio}>
                Volver al panel principal
              </Button>
            </div>
          }
        />
      </Card>
    );
  }
}

export default PageErrorBoundary;
