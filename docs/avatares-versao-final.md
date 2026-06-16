# Avatares IA — Versão Final

## Status atual
- ✅ Demo: SVGs cartoon criados em `src/components/ai/AvatarSofia.tsx` e `AvatarDonaMaria.tsx`
- ⏳ Versão final: ilustrações profissionais a contratar/gerar

---

## 👩‍🏫 Professora Sofia

**Papel:** Agente do material didático — chat flutuante em todos os painéis  
**Personalidade:** Jovem, animada, paciente, usa óculos, fala de forma simples com alunos

### Referências visuais
- Cabelo castanho preso em coque com laço vermelho
- Óculos redondos roxos
- Blusa/blazer roxo (cor primária do sistema)
- Expressão alegre e acolhedora

### Prompt para geração (Adobe Firefly / Midjourney / DALL-E)
```
Cartoon avatar of a young Brazilian female teacher named Sofia, 
brown hair in a bun with a red bow, round purple glasses, 
purple blazer, warm friendly smile, flat design illustration, 
child-friendly style, white or transparent background, 
vibrant colors, Pixar-inspired
```

### Formatos necessários para produção
- [ ] PNG 512×512 (avatar no chat)
- [ ] PNG 256×256 (balão flutuante)
- [ ] SVG (escalável, para substituir o atual)
- [ ] Versão animada (opcional — piscando, acenando) em Lottie JSON

---

## 👩‍⚕️ Dona Maria

**Papel:** Agente de Inclusão — homenagem à Maria José, neurocientista  
**Personalidade:** Maternal, sábia, acolhedora, especialista em crianças atípicas

### Referências visuais (fotos reais)
- Cabelo preto na altura do ombro
- Jaleco branco (ela usa jaleco no consultório)
- Sorriso largo e acolhedor
- Brincos discretos
- Expressão serena e profissional

### Prompt para geração
```
Cartoon avatar of a warm Brazilian woman in her 50s named Maria José, 
black straight hair shoulder length, white doctor coat, 
big warm smile, gentle expression, flat design illustration, 
child-friendly and professional style, white or transparent background,
soft colors, Pixar or Disney-inspired character design
```

### Formatos necessários
- [ ] PNG 512×512 (avatar no formulário de inclusão)
- [ ] PNG 256×256 (balão flutuante)
- [ ] SVG (escalável)
- [ ] Versão com poses: sorrindo, pensando, aprovando (para estados da IA)
- [ ] Versão animada Lottie (opcional)

---

## Onde substituir no código

| Componente | Arquivo | O que trocar |
|---|---|---|
| Chat flutuante (Sofia) | `src/components/ai/ChatFlutuante.tsx` | `<AvatarSofia>` → `<img src="/avatares/sofia.png">` |
| Balão flutuante (Sofia) | `src/components/ai/BotaoChat.tsx` | SVG inline → PNG |
| Formulário inclusão (Dona Maria) | `src/components/ai/AgenteInclusao.tsx` | `<AvatarDonaMaria>` → `<img src="/avatares/dona-maria.png">` |

### Pasta destino das imagens finais
```
public/
  avatares/
    sofia.png
    sofia-256.png
    dona-maria.png
    dona-maria-256.png
    sofia.lottie.json       (opcional)
    dona-maria.lottie.json  (opcional)
```

---

## Cronograma sugerido (pós-demo)
| Tarefa | Responsável | Prazo |
|---|---|---|
| Gerar ilustrações com IA (Firefly/Midjourney) | Junior | Semana 1 |
| Revisar com Dona Maria se aprovou o avatar | Junior + Maria José | Semana 1 |
| Exportar nos formatos necessários | Junior | Semana 1 |
| Substituir SVGs no código | Dev | Semana 2 |
| Criar animações Lottie (opcional) | Designer | Semana 3 |
