---
name: Feature
about: Nova funcionalidade ou melhoria no Portal Conexão AVA
title: "feat: [descrição curta da feature]"
labels: enhancement
assignees: jjsjunior3
---

## Por que esta feature?

<!-- Qual problema resolve? Quem pediu? -->

---

## User story

> Como **[perfil de usuário]**, quero **[ação]** para que **[benefício]**.

---

## Comportamento esperado

<!-- Descreva o que deve acontecer do ponto de vista do usuário -->

---

## Regras de negócio

<!-- Liste as regras específicas que a implementação deve respeitar -->
- 
- 

---

## Fluxo (se aplicável)

```
Passo 1 → Passo 2 → Passo 3
```

---

## Arquivos a criar ou modificar

<!-- Seja específico — qual componente, qual arquivo -->
- [ ] `src/components/...` — criar / modificar
- [ ] `src/hooks/...` — criar / modificar (se necessário)

---

## Tabelas do Supabase envolvidas

<!-- Quais tabelas serão lidas ou escritas? -->
- `tabela_nome` — operação (SELECT / INSERT / UPDATE / DELETE)

---

## Schema novo (se necessário)

```sql
-- Novo campo, nova tabela ou nova constraint:
```

---

## Critérios de aceite

- [ ] Funciona no segmento EAD
- [ ] Funciona no segmento Presencial
- [ ] Dark mode funciona
- [ ] Responsivo no mobile
- [ ] Toast de sucesso e erro implementados
- [ ] Build passa sem erros (`npx vite build`)

---

## Estimativa de esforço

- [ ] Pequeno (< 1h) — mudança em 1 arquivo
- [ ] Médio (1–3h) — mudança em 2–4 arquivos
- [ ] Grande (> 3h) — novo componente ou mudança de schema

---

## Seguro para produção?

- [ ] Sim — apenas adição de UI, sem risco a dados existentes
- [ ] Requer SQL — ver script abaixo
- [ ] Requer teste cuidadoso — descrever o risco

```sql
-- SQL necessário (se aplicável):
```
