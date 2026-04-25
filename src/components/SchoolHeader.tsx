// src/components/SchoolHeader.tsx
import { GraduationCap, Sun, Moon } from 'lucide-react';
import { SCHOOL_CONFIG } from '../config/school';
import { useTheme } from '../contexts/ThemeContext';

interface SchoolHeaderProps {
  subtitle?: string;
}

export function SchoolHeader({ subtitle }: SchoolHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-between w-full">

      {/* Lado Esquerdo: Logo e Nome */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Logo da Escola */}
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden bg-card border border-border shadow-sm flex-shrink-0">
          <img
            src={SCHOOL_CONFIG.logoUrl}
            alt={SCHOOL_CONFIG.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary hidden" />
        </div>

        {/* Nome da Escola */}
        <div className="min-w-0">
          <h1 className={`font-bold text-sm sm:text-xl bg-gradient-to-r ${SCHOOL_CONFIG.primaryColor} bg-clip-text text-transparent leading-tight truncate`}>
            {SCHOOL_CONFIG.name}
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Lado Direito: Botão de Dark Mode */}
      <button
        onClick={toggleTheme}
        className="p-1.5 sm:p-2 rounded-full bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors border border-border flex-shrink-0"
        aria-label="Alternar tema"
      >
        {theme === 'light' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>

    </div>
  );
}