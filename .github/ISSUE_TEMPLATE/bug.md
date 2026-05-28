---
name: Bug
about: Reportar um bug no Portal Conexão AVA
title: "fix: [descrição curta do problema]"
labels: bug
assignees: jjsjunior3
---

## Contexto

<!-- Onde o bug acontece? Qual perfil de usuário? Qual segmento (EAD/Presencial)? -->

**Perfil afetado:** <!-- aluno / professor / coordenador / admin / ... -->
**Segmento:** <!-- EAD / Presencial / Ambos -->
**Componente/arquivo:** <!-- ex: src/components/DashboardCoordenador.tsx -->

---

## Comportamento atual

<!-- O que está acontecendo de errado? -->

---

## Comportamento esperado

<!-- O que deveria acontecer? -->

---

## Como reproduzir

1. Logar como `[perfil]`
2. Acessar `[seção]`
3. Clicar em `[ação]`
4. Ver o erro

---

## Arquivos provavelmente afetados

<!-- Liste os arquivos que precisam ser alterados -->
- `src/components/...`

---

## Tabelas do Supabase envolvidas

<!-- Se o bug envolve query, informe as tabelas -->
- `tabela_nome`

---

## Critérios de aceite

- [ ] O bug não ocorre mais no cenário descrito
- [ ] O fix não quebrou outros perfis de acesso
- [ ] Dark mode continua funcionando
- [ ] Build passa sem erros (`npx vite build`)

---

## Severidade

- [ ] 🔴 Crítico — sistema em produção com dados errados ou inacessível
- [ ] 🟡 Importante — funcionalidade principal prejudicada
- [ ] 🟢 Baixo — visual ou edge case

---

## Seguro para produção?

- [ ] Sim — apenas mudança de frontend, sem alteração de schema ou RLS
- [ ] Requer SQL — descreva abaixo o script necessário

```sql
-- SQL necessário (se aplicável):
```
