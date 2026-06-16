// src/components/ai/AvatarDonaMaria.tsx
// Avatar SVG cartoon da Dona Maria — versão demo
// TODO versão final: substituir pelo avatar ilustrado gerado por IA
// Ver: docs/avatar-dona-maria-final.md

interface Props {
  size?: number
  className?: string
}

export function AvatarDonaMaria({ size = 56, className = '' }: Props) {
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
      <circle cx="50" cy="50" r="50" fill="#EEF6FF" />

      {/* Jaleco branco — corpo */}
      <rect x="18" y="62" width="64" height="44" rx="12" fill="#FFFFFF" />
      {/* Detalhe jaleco — lapelas */}
      <path d="M50 65 L38 72 L38 90 L50 85 L62 90 L62 72 Z" fill="#F0F4FF" />
      {/* Bolso jaleco */}
      <rect x="28" y="74" width="14" height="10" rx="3" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
      {/* Cruz médica no bolso */}
      <rect x="33" y="77" width="4" height="1.5" rx="0.5" fill="#3B82F6" />
      <rect x="34.5" y="75.5" width="1.5" height="4" rx="0.5" fill="#3B82F6" />

      {/* Pescoço */}
      <rect x="43" y="56" width="14" height="12" rx="4" fill="#FDDBB4" />

      {/* Rosto */}
      <ellipse cx="50" cy="42" rx="22" ry="22" fill="#FDDBB4" />

      {/* Cabelo preto — topo e laterais */}
      <ellipse cx="50" cy="24" rx="22" ry="12" fill="#1A1A1A" />
      <ellipse cx="28" cy="38" rx="7" ry="16" fill="#1A1A1A" />
      <ellipse cx="72" cy="38" rx="7" ry="16" fill="#1A1A1A" />
      {/* Franja */}
      <path d="M30 28 Q50 20 70 28 Q65 34 50 32 Q35 34 30 28Z" fill="#1A1A1A" />

      {/* Olhos */}
      <ellipse cx="41" cy="42" rx="4" ry="4.5" fill="white" />
      <ellipse cx="59" cy="42" rx="4" ry="4.5" fill="white" />
      <circle cx="41" cy="43" r="2.5" fill="#3D2B1F" />
      <circle cx="59" cy="43" r="2.5" fill="#3D2B1F" />
      <circle cx="42" cy="42" r="0.8" fill="white" />
      <circle cx="60" cy="42" r="0.8" fill="white" />
      {/* Sobrancelhas */}
      <path d="M37 37 Q41 35 45 37" stroke="#3D2B1F" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M55 37 Q59 35 63 37" stroke="#3D2B1F" strokeWidth="1.5" strokeLinecap="round" />

      {/* Sorriso */}
      <path d="M40 51 Q50 59 60 51" stroke="#C97B63" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M43 52 Q50 57 57 52" fill="#F4A0A0" opacity="0.4" />

      {/* Bochechas rosadas */}
      <ellipse cx="34" cy="49" rx="5" ry="3.5" fill="#F9A8A8" opacity="0.5" />
      <ellipse cx="66" cy="49" rx="5" ry="3.5" fill="#F9A8A8" opacity="0.5" />

      {/* Brinco */}
      <circle cx="27.5" cy="44" r="2" fill="#C084FC" />
      <circle cx="72.5" cy="44" r="2" fill="#C084FC" />
    </svg>
  )
}
