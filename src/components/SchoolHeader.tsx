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
      <div className="flex items-center gap-3">
        {/* Logo da Escola */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-card border border-border shadow-sm">
          <img
            src={SCHOOL_CONFIG.logoUrl}
            alt={SCHOOL_CONFIG.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <GraduationCap className="w-6 h-6 text-primary hidden" />
        </div>

        {/* Nome da Escola */}
        <div>
          <h1 className={`font-bold text-xl bg-gradient-to-r ${SCHOOL_CONFIG.primaryColor} bg-clip-text text-transparent`}>
            {SCHOOL_CONFIG.name}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Lado Direito: Botão de Dark Mode */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors border border-border"
        aria-label="Alternar tema"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

    </div>
  );
}