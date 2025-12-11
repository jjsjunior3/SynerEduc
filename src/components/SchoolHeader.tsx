// src/components/SchoolHeader.tsx
import { GraduationCap } from 'lucide-react';
import { SCHOOL_CONFIG } from '../config/school';

interface SchoolHeaderProps {
  subtitle?: string; // Ex: "Portal do Professor", "Portal do Aluno"
}

export function SchoolHeader({ subtitle }: SchoolHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Logo da Escola */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white shadow-lg">
        <img 
          src={SCHOOL_CONFIG.logoUrl} 
          alt={SCHOOL_CONFIG.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback: se a imagem não carregar, mostra o ícone
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
        />
        <GraduationCap className="w-6 h-6 text-blue-600 hidden" />
      </div>

      {/* Nome da Escola */}
      <div>
        <h1 className={`font-bold text-xl bg-gradient-to-r ${SCHOOL_CONFIG.primaryColor} bg-clip-text text-transparent`}>
          {SCHOOL_CONFIG.name}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-600">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
