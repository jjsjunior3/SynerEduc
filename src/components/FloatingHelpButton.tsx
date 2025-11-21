import React, { useState } from 'react';
import { Button } from './ui/button';
import { HelpCircle, X } from 'lucide-react';
import { AcessoRapidoCorrecoes } from './AcessoRapidoCorrecoes';

interface FloatingHelpButtonProps {
  show?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function FloatingHelpButton({ 
  show = true, 
  position = 'bottom-left' 
}: FloatingHelpButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  if (!show || isMinimized) {
    return null;
  }

  return (
    <>
      <div className={`fixed ${positionClasses[position]} z-40 flex items-center gap-2`}>
        {/* Dica visual */}
        <div className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm max-w-64 relative">
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute -top-1 -right-1 bg-gray-600 hover:bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            title="Minimizar dica"
          >
            <X className="w-3 h-3" />
          </button>
          
          <p className="font-medium mb-1">💡 Dica para Administradores</p>
          <p className="text-xs text-blue-100">
            Clique no botão de ajuda para acessar modos de correção em caso de problemas no sistema.
          </p>
        </div>

        {/* Botão de ajuda */}
        <Button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 p-0 shadow-lg transition-all duration-200 hover:scale-105"
          title="Modos de Correção"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
      </div>

      {/* Modal de correções */}
      {showModal && (
        <AcessoRapidoCorrecoes onClose={() => setShowModal(false)} />
      )}
    </>
  );
}