import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface FastLoaderProps {
  children: React.ReactNode;
  maxTime?: number; // Maximum time to show loader in milliseconds
}

export function FastLoader({ children, maxTime = 3000 }: FastLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Carregando...');

  useEffect(() => {
    // Ultra-fast loading sequence
    const messages = [
      'Carregando...',
      'Verificando configurações...',
      'Quase pronto...'
    ];

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      if (messageIndex < messages.length - 1) {
        messageIndex++;
        setLoadingMessage(messages[messageIndex]);
      }
    }, 800);

    // Force loading to complete after maxTime
    const forceComplete = setTimeout(() => {
      setIsLoading(false);
      clearInterval(messageInterval);
    }, maxTime);

    // Also check if DOM is ready
    const checkReady = () => {
      if (document.readyState === 'complete') {
        setTimeout(() => {
          setIsLoading(false);
          clearInterval(messageInterval);
          clearTimeout(forceComplete);
        }, 1000); // Minimum 1 second display
      }
    };

    if (document.readyState === 'complete') {
      checkReady();
    } else {
      document.addEventListener('readystatechange', checkReady);
    }

    return () => {
      clearInterval(messageInterval);
      clearTimeout(forceComplete);
      document.removeEventListener('readystatechange', checkReady);
    };
  }, [maxTime]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">AVA Colégio Conexão</h2>
          <p className="text-gray-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}