
# Gestor de Obras — Proposta Técnica (pré-implementação)

Sistema web responsivo para controle financeiro de obras, com extração de notas fiscais por IA via painel web e WhatsApp.

---

## 1. Arquitetura Recomendada

**Stack**
- Frontend: TanStack Start (React 19 + Vite) já configurado no projeto, Tailwind v4, shadcn/ui.
- Backend de aplicação: TanStack `createServerFn` (RPC tipado) + server routes em `src/routes/api/public/*` para webhooks externos (WhatsApp).
- Banco / Auth / Storage: **Lovable Cloud** (Supabase gerenciado) — Postgres + Auth + Storage + RLS multi-tenant.
- IA (OCR + extração estruturada): **Lovable AI Gateway** com `google/gemini-3-flash-preview` (multimodal: imagem + PDF) usando `Output.object` + Zod para JSON estruturado. Sem chave de terceiros no MVP.
- WhatsApp: **WhatsApp Business Cloud API (Meta)** via webhook público em `/api/public/whatsapp/webhook` (verificação GET + recebimento POST) e envio via Graph API. Segredos: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `META_APP_SECRET` (assinatura HMAC).

**Princípios**
- Toda chamada à IA, WhatsApp e Storage privilegiado ocorre **no servidor**.
- Multi-tenant por `empresa_id` em todas as tabelas, com RLS baseada em `has_company_access(auth.uid(), empresa_id)` (SECURITY DEFINER, sem recursão).
- Papéis (`admin`, `gestor`, `apontador`) em tabela `user_roles` separada (nunca em `profiles`).
- Nada vai para o custo da obra sem `status = 'aprovada'` confirmado por humano.

```
[Web / Mobile browser] ──┐
                          ├─► TanStack Start (server fns) ──► Supabase (Postgres + Storage + Auth)
[WhatsApp Business API] ──┘                  │
                                              └──► Lovable AI Gateway (Gemini multimodal)
```

---

## 2. Modelo de Dados (Postgres / Supabase)

Todas as tabelas em `public`, com RLS habilitada e GRANTs explícitos.

- **empresas** — `id, nome, cnpj, criada_em`
- **profiles** — `id (=auth.users.id), nome, email, telefone, avatar_url`
- **company_members** — `empresa_id, user_id, criado_em` (vínculo N:N)
- **user_roles** — `id, user_id, empresa_id, role app_role` (`admin|gestor|apontador`)
- **obras** — `id, empresa_id, nome, endereco, responsavel_id, orcamento numeric(14,2), data_inicio, data_fim_prevista, status (planejada|em_andamento|pausada|concluida), criada_em`
- **fornecedores** — `id, empresa_id, nome, cnpj_cpf, telefone, email`
- **categorias_custo** — `id, empresa_id, nome, cor` (ex.: Cimento, Elétrica, Mão de obra…)
- **notas_fiscais** — `id, empresa_id, obra_id, fornecedor_id, numero, serie, data_emissao, valor_total numeric(14,2), desconto numeric(14,2), status (pendente|em_conferencia|aprovada|rejeitada), origem (web|whatsapp), criada_por, criada_em, aprovada_por, aprovada_em, hash_dedup text` (índice único parcial em `empresa_id, fornecedor_id, numero, data_emissao, valor_total` para anti-duplicidade)
- **itens_nota** — `id, nota_id, categoria_id, descricao, quantidade numeric(14,3), unidade, valor_unitario numeric(14,4), valor_total numeric(14,2), confianca numeric(3,2)`
- **anexos** — `id, nota_id, bucket, path, mime, tamanho, criada_em` (bucket privado `notas-fiscais`)
- **ia_extracoes** — `id, nota_id, payload_bruto jsonb, modelo, custo_tokens, criada_em` (sempre preservar o JSON original)
- **ia_correcoes** — `id, nota_id, campo, valor_antigo, valor_novo, user_id, criada_em` (auditoria de correções)
- **whatsapp_contatos** — `id, empresa_id, telefone_e164, profile_id, nome_exibicao, obra_padrao_id`
- **whatsapp_mensagens** — `id, contato_id, direcao (in|out), wa_message_id, tipo, conteudo jsonb, criada_em`
- **whatsapp_sessoes** — `id, contato_id, estado (aguardando_obra|aguardando_confirmacao|ocioso), nota_id, expira_em`
- **audit_log** — `id, empresa_id, user_id, entidade, entidade_id, acao, diff jsonb, criada_em`

**RLS** — função `public.has_company_access(_user uuid, _empresa uuid) returns boolean` (SECURITY DEFINER) consultando `company_members`. Políticas: SELECT/INSERT/UPDATE/DELETE em todas as tabelas restritas por `has_company_access(auth.uid(), empresa_id)`. Itens/anexos/extrações herdam via `nota_id → notas_fiscais.empresa_id`. `service_role` sempre com `GRANT ALL`.

---

## 3. Fluxo das Telas

```
/auth                  Login / cadastro (email+senha + Google)
/onboarding            Criar empresa, convidar membros
/                      Dashboard da empresa (seletor de obra)
/obras                 Lista de obras
/obras/nova
/obras/:id             Detalhe: orçamento, realizado, saldo, gráfico por categoria/período
/obras/:id/notas       Notas da obra
/notas                 Inbox global (pendentes / em conferência / aprovadas / rejeitadas)
/notas/upload          Envio web (arrastar imagem/PDF)
/notas/:id/conferencia Tela split: imagem ↔ formulário extraído (campos com baixa confiança destacados)
/fornecedores
/categorias
/configuracoes/whatsapp  Vincular telefones, obra padrão, status do webhook
/configuracoes/equipe    Membros e papéis
```

Conferência: imagem à esquerda (zoom/pan), à direita cabeçalho da nota + tabela editável de itens + somatório com alerta se diverge do total. Botões `Aprovar`, `Salvar rascunho`, `Rejeitar`.

---

## 4. Etapas de Desenvolvimento

1. **Fundação** — Ativar Lovable Cloud; design system (verde-escuro, areia, branco, laranja); layout com sidebar; auth (email+senha + Google); rota `_authenticated`.
2. **Multi-tenant** — Tabelas `empresas`, `profiles`, `company_members`, `user_roles`; trigger de criação de profile; `has_company_access`; onboarding.
3. **Cadastros base** — Obras, fornecedores, categorias (CRUD + RLS).
4. **Upload web + Storage** — Bucket privado `notas-fiscais`; upload de imagem/PDF; criação de nota `pendente` com anexo.
5. **Extração por IA** — Server fn que chama Gemini multimodal com schema Zod; salva `ia_extracoes` (bruto) e popula itens; calcula `confianca` por campo; gera `hash_dedup` e bloqueia duplicatas.
6. **Tela de conferência** — Split image/form; edição de itens; registro em `ia_correcoes`; aprovação → status `aprovada` (entra no custo).
7. **Dashboard** — Orçamento/realizado/saldo/% consumido, custos por categoria e por período, pendentes, últimas compras.
8. **Histórico e auditoria** — `audit_log` em mutações sensíveis.
9. **WhatsApp** — Webhook público com verificação HMAC; máquina de estados (`aguardando_obra → aguardando_confirmacao → ocioso`); reuso do mesmo pipeline de IA; respostas com resumo e botões `Confirmar / Corrigir / Cancelar`.
10. **Polimento** — Estados de loading/erro/sucesso, responsividade mobile-first para canteiro, testes manuais com notas reais.

---

## 5. Dependências e Credenciais

**A ativar pela Lovable**
- Lovable Cloud (Supabase): Auth, Postgres, Storage, RLS.
- Lovable AI Gateway: `LOVABLE_API_KEY` (auto-provisionada). Modelo padrão `google/gemini-3-flash-preview`.

**Pacotes npm a adicionar**
- `zod` (validação + schema da extração)
- `recharts` (gráficos do dashboard)
- `date-fns` (datas em pt-BR)
- `react-markdown` (somente se exibirmos respostas de IA)

**Segredos que você precisará fornecer (apenas na etapa 9 — WhatsApp)**
- `WHATSAPP_VERIFY_TOKEN` (você define, qualquer string)
- `WHATSAPP_ACCESS_TOKEN` (token permanente do app Meta)
- `WHATSAPP_PHONE_NUMBER_ID` (do número WABA)
- `META_APP_SECRET` (para validar assinatura `x-hub-signature-256`)

Onde obter: Meta for Developers → criar App tipo Business → adicionar produto WhatsApp → gerar token permanente via System User. URL do webhook a configurar lá:
`https://project--eac98264-4737-41b5-92ab-a6c2a5474c24.lovable.app/api/public/whatsapp/webhook`

**Decisões pendentes da sua aprovação**
1. Confirmar stack acima (Lovable Cloud + Lovable AI + WhatsApp Cloud API).
2. Confirmar papéis: `admin`, `gestor`, `apontador` (ou outros).
3. Login social: incluir Google além de email/senha?
4. Construir tudo até a etapa 8 primeiro, e só depois ativar WhatsApp (etapa 9) quando você tiver os tokens da Meta — ok?
