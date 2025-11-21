// Componente para testar se todas as importações do AuthContext estão corretas

   import { AuthProvider, useAuth } from '../contexts/AuthContext';

export function AuthImportTest() {
  try {
    const { usuario, isLoggedIn } = useAuth();
    
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-green-800 font-medium">✅ AuthContext Import Test</h3>
        <p className="text-green-700 text-sm">
          AuthContext funcionando corretamente.
          {isLoggedIn ? ` Usuário logado: ${usuario?.nome}` : ' Usuário não logado.'}
        </p>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-medium">❌ AuthContext Import Error</h3>
        <p className="text-red-700 text-sm">Erro: {error.message}</p>
      </div>
    );
  }
}