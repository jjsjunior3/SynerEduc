import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  WifiOff, 
  User, 
  BookOpen, 
  FileText, 
  Settings,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';

export function OfflineMode() {
  const [selectedSection, setSelectedSection] = useState<string>('info');

  const offlineSections = [
    {
      id: 'info',
      title: 'Informações',
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <h4 className="font-medium text-yellow-800">Modo Offline Ativo</h4>
            </div>
            <p className="text-yellow-700 text-sm">
              Você está usando o modo offline. Algumas funcionalidades estão limitadas até 
              que a conexão seja restabelecida.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h5 className="font-medium text-green-800 mb-1">Disponível</h5>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Informações básicas</li>
                <li>• Configurações locais</li>
                <li>• Documentação</li>
              </ul>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h5 className="font-medium text-red-800 mb-1">Indisponível</h5>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Login/Logout</li>
                <li>• Conteúdo online</li>
                <li>• Sincronização</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'profile',
      title: 'Perfil',
      icon: <User className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="font-medium text-gray-900">Usuário Offline</h3>
            <p className="text-sm text-gray-600">Conecte-se para ver seu perfil</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Dados Salvos Localmente</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Última sessão: {localStorage.getItem('last_session') || 'Não disponível'}</div>
              <div>Configurações: {Object.keys(localStorage).length} itens salvos</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'materials',
      title: 'Materiais',
      icon: <BookOpen className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="text-center py-8">
            <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Conteúdo Offline</h3>
            <p className="text-gray-600 text-sm">
              Os materiais de estudo estão disponíveis apenas online.
              Conecte-se à internet para acessar seus conteúdos.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">💡 Dica</h4>
            <p className="text-blue-700 text-sm">
              Quando conectado, você pode baixar materiais para acesso offline.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'help',
      title: 'Ajuda',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="font-medium">Resolução de Problemas</h3>
          
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <h4 className="font-medium mb-1">Sem conexão com internet</h4>
              <p className="text-sm text-gray-600 mb-2">
                Verifique sua conexão Wi-Fi ou dados móveis.
              </p>
              <Button size="sm" variant="outline">
                Testar Conexão
              </Button>
            </div>
            
            <div className="border rounded-lg p-3">
              <h4 className="font-medium mb-1">Problemas com o servidor</h4>
              <p className="text-sm text-gray-600 mb-2">
                O servidor pode estar temporariamente indisponível.
              </p>
              <Button size="sm" variant="outline">
                Verificar Status
              </Button>
            </div>
            
            <div className="border rounded-lg p-3">
              <h4 className="font-medium mb-1">Cache corrompido</h4>
              <p className="text-sm text-gray-600 mb-2">
                Limpe o cache do navegador para resolver problemas.
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
              >
                Limpar Cache
              </Button>
            </div>
          </div>
        </div>
      )
    }
  ];

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache' 
      });
      
      if (response.ok) {
        localStorage.removeItem('force_offline_mode');
        window.location.reload();
      }
    } catch (error) {
      console.log('Still offline');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">AVA - Modo Offline</h1>
              <p className="text-sm text-gray-600">Funcionalidade limitada</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="bg-red-100 text-red-800">
              Offline
            </Badge>
            <Button 
              onClick={checkConnection}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Reconectar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <nav className="space-y-2">
              {offlineSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedSection === section.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {section.icon}
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {offlineSections.find(s => s.id === selectedSection)?.icon}
                {offlineSections.find(s => s.id === selectedSection)?.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {offlineSections.find(s => s.id === selectedSection)?.content}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="text-center text-sm text-gray-600">
          <p>
            Modo offline ativo. Para funcionalidade completa, verifique sua conexão com a internet.
          </p>
        </div>
      </div>
    </div>
  );
}