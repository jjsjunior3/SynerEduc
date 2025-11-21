import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  HelpCircle, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
  Bug
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AcessoRapidoCorrecoesProps {
  onClose?: () => void;
}

interface ModoCorrecao {
  id: string;
  nome: string;
  descricao: string;
  url: string;
  icon: React.ReactNode;
  cor: string;
  quando: string;
}

export function AcessoRapidoCorrecoes({ onClose }: AcessoRapidoCorrecoesProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const modos: ModoCorrecao[] = [
    {
      id: 'timeout-killer',
      nome: 'Resolver Timeouts',
      descricao: 'Corrige problemas de timeout e conexões lentas',
      url: '?mode=timeout-killer',
      icon: <RefreshCw className="w-5 h-5" />,
      cor: 'bg-blue-500 text-white',
      quando: 'Quando APIs demoram muito para responder'
    },
    {
      id: 'correcao-404',
      nome: 'Corrigir Erro 404',
      descricao: 'Resolve erros de rotas não encontradas na API',
      url: '?mode=correcao-404',
      icon: <AlertTriangle className="w-5 h-5" />,
      cor: 'bg-orange-500 text-white',
      quando: 'Quando aparecem erros 404 nas chamadas da API'
    },
    {
      id: 'admin',
      nome: 'Painel Admin',
      descricao: 'Acesso direto ao painel administrativo',
      url: '?mode=admin',
      icon: <Settings className="w-5 h-5" />,
      cor: 'bg-purple-500 text-white',
      quando: 'Para gerenciar usuários e configurações'
    },
    {
      id: 'diagnostico-api',
      nome: 'Diagnóstico Completo',
      descricao: 'Verifica todas as APIs e conectividade',
      url: '?mode=diagnostico-api',
      icon: <Bug className="w-5 h-5" />,
      cor: 'bg-green-500 text-white',
      quando: 'Para diagnosticar problemas gerais do sistema'
    },
    {
      id: 'emergencia',
      nome: 'Modo Emergência',
      descricao: 'Acesso de emergência para problemas críticos',
      url: '?mode=emergencia',
      icon: <AlertTriangle className="w-5 h-5" />,
      cor: 'bg-red-500 text-white',
      quando: 'Quando o sistema está com problemas críticos'
    }
  ];

  const copyToClipboard = async (url: string, id: string) => {
    try {
      const fullUrl = window.location.origin + window.location.pathname + url;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(id);
      toast.success('URL copiada para área de transferência!');
      
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar URL');
    }
  };

  const abrirModo = (url: string) => {
    window.location.href = url;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-center gap-2 mb-2">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <CardTitle className="text-xl">Modos de Correção - Acesso Rápido</CardTitle>
          </div>
          <p className="text-gray-600 text-sm">
            Use estes modos para resolver problemas específicos no sistema
          </p>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modos.map((modo) => (
              <div key={modo.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${modo.cor} flex-shrink-0`}>
                    {modo.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {modo.nome}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {modo.descricao}
                    </p>
                    
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs">
                        {modo.quando}
                      </Badge>
                    </div>

                    {/* URL do modo */}
                    <div className="bg-gray-50 rounded p-2 mb-3 text-xs font-mono text-gray-700 border">
                      {window.location.origin + window.location.pathname + modo.url}
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => abrirModo(modo.url)}
                        className="flex-1"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Abrir
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(modo.url, modo.id)}
                        className="px-3"
                      >
                        {copied === modo.id ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Instruções gerais */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Como usar
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Clique em "Abrir" para acessar diretamente o modo</li>
              <li>• Use "Copiar" para compartilhar a URL com outros usuários</li>
              <li>• Os modos funcionam adicionando parâmetros à URL atual</li>
              <li>• Para voltar ao sistema normal, remova o parâmetro ?mode= da URL</li>
            </ul>
          </div>

          {/* Botões de controle */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            
            <Button onClick={() => copyToClipboard('', 'all')}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar Todas as URLs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}