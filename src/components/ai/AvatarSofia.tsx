// src/components/ai/AvatarSofia.tsx
// Avatar SVG cartoon da Professora Sofia — versão demo
// TODO versão final: substituir pelo avatar ilustrado gerado por IA
// Ver: docs/avatar-sofia-final.md

interface Props {
  size?: number
  className?: string
}

export function AvatarSofia({ size = 56, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fundo circular */}
      <circle cx="50" cy="50" r="50" fill="#FFF7ED" />

      {/* Corpo — blusa roxa de professora */}
      <rect x="18" y="62" width="64" height="44" rx="12" fill="#7C3AED" />
      {/* Detalhe colar/gola */}
      <path d="M50 65 L40 70 L40 86 L50 82 L60 86 L60 70 Z" fill="#6D28D9" />
      {/* Crachá */}
      <rect x="56" y="72" width="14" height="10" rx="2" fill="#DDD6FE" stroke="#A78BFA" strokeWidth="1" />
      <rect x="58" y="74" width="8" height="1.5" rx="0.5" fill="#7C3AED" />
      <rect x="58" y="77" width="6" height="1.5" rx="0.5" fill="#7C3AED" />

      {/* Pescoço */}
      <rect x="43" y="56" width="14" height="12" rx="4" fill="#FDDBB4" />

      {/* Rosto */}
      <ellipse cx="50" cy="42" rx="22" ry="22" fill="#FDDBB4" />

      {/* Cabelo — castanho claro, preso */}
      <ellipse cx="50" cy="23" rx="22" ry="11" fill="#92400E" />
      <ellipse cx="29" cy="36" rx="6" ry="14" fill="#92400E" />
      <ellipse cx="71" cy="36" rx="6" ry="14" fill="#92400E" />
      {/* Coque no topo */}
      <ellipse cx="50" cy="19" rx="10" ry="7" fill="#B45309" />
      <circle cx="50" cy="13" r="4" fill="#92400E" />
      {/* Laço no coque */}
      <ellipse cx="44" cy="14" rx="5" ry="3" fill="#FCA5A5" transform="rotate(-20 44 14)" />
      <ellipse cx="56" cy="14" rx="5" ry="3" fill="#FCA5A5" transform="rotate(20 56 14)" />
      <circle cx="50" cy="14" r="2" fill="#F87171" />

      {/* Olhos */}
      <ellipse cx="41" cy="42" rx="4" ry="4.5" fill="white" />
      <ellipse cx="59" cy="42" rx="4" ry="4.5" fill="white" />
      <circle cx="41" cy="43" r="2.5" fill="#1E3A5F" />
      <circle cx="59" cy="43" r="2.5" fill="#1E3A5F" />
      <circle cx="42" cy="42" r="0.8" fill="white" />
      <circle cx="60" cy="42" r="0.8" fill="white" />
      {/* Sobrancelhas */}
      <path d="M37 37 Q41 35.5 45 37" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M55 37 Q59 35.5 63 37" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />

      {/* Sorriso animado */}
      <path d="M40 51 Q50 60 60 51" stroke="#C97B63" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M43 52 Q50 58 57 52" fill="#F4A0A0" opacity="0.4" />

      {/* Bochechas */}
      <ellipse cx="34" cy="49" rx="5" ry="3.5" fill="#FCA5A5" opacity="0.5" />
      <ellipse cx="66" cy="49" rx="5" ry="3.5" fill="#FCA5A5" opacity="0.5" />

      {/* Óculos */}
      <rect x="33" y="38" width="13" height="9" rx="4" stroke="#7C3AED" strokeWidth="1.8" fill="none" />
      <rect x="54" y="38" width="13" height="9" rx="4" stroke="#7C3AED" strokeWidth="1.8" fill="none" />
      <line x1="46" y1="42" x2="54" y2="42" stroke="#7C3AED" strokeWidth="1.8" />
      <line x1="27" y1="40" x2="33" y2="41" stroke="#7C3AED" strokeWidth="1.5" />
      <line x1="67" y1="41" x2="73" y2="40" stroke="#7C3AED" strokeWidth="1.5" />

      {/* Brinco estrela */}
      <text x="22" y="48" fontSize="7" fill="#FCD34D">★</text>
      <text x="68" y="48" fontSize="7" fill="#FCD34D">★</text>
    </svg>
  )
}
