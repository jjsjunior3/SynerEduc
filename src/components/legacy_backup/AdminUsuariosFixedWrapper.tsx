import { AdminUsuariosFixed } from './AdminUsuariosFixed';
import { Component, ReactNode } from 'react';
import { Button } from './ui/button';

interface AdminUsuariosFixedWrapperProps {
  onVoltar: () => void;
}

class AdminErrorBoundary extends Component<
  { children: ReactNode; onVoltar: () => void }, 
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; onVoltar: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('[ADMIN_ERROR_BOUNDARY] Erro capturado:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ADMIN_ERROR_BOUNDARY] componentDidCatch:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <h1 className="text-xl font-bold text-red-600 mb-4">⚠️ Erro no AdminUsuarios</h1>
            <p className="text-gray-700 mb-4">
              Erro específico no componente AdminUsuarios: {this.state.error?.message}
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }} 
                className="w-full"
              >
                🔄 Tentar Novamente
              </Button>
              <Button 
                variant="outline"
                onClick={this.props.onVoltar} 
                className="w-full"
              >
                ← Voltar
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AdminUsuariosFixedWrapper({ onVoltar }: AdminUsuariosFixedWrapperProps) {
  console.log('[ADMIN_WRAPPER] Renderizando wrapper...');
  
  return (
    <AdminErrorBoundary onVoltar={onVoltar}>
      <AdminUsuariosFixed onVoltar={onVoltar} />
    </AdminErrorBoundary>
  );
}