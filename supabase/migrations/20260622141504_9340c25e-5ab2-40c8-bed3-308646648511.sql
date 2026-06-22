
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','gestor','apontador');
CREATE TYPE public.obra_status AS ENUM ('planejada','em_andamento','pausada','concluida');
CREATE TYPE public.nota_status AS ENUM ('pendente','em_conferencia','aprovada','rejeitada');
CREATE TYPE public.nota_origem AS ENUM ('web','whatsapp');
CREATE TYPE public.wa_direcao AS ENUM ('in','out');
CREATE TYPE public.wa_estado AS ENUM ('aguardando_obra','aguardando_confirmacao','ocioso');

-- ============ UTIL: updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ EMPRESAS ============
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  criada_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_empresas_upd BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  email text,
  telefone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ COMPANY MEMBERS ============
CREATE TABLE public.company_members (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS (no recursion) ============
CREATE OR REPLACE FUNCTION public.has_company_access(_user uuid, _empresa uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE user_id = _user AND empresa_id = _empresa);
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user uuid, _empresa uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user AND empresa_id = _empresa AND role = _role);
$$;

-- ============ RLS for empresas / profiles / members / roles ============
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles self upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "empresas members read" ON public.empresas FOR SELECT TO authenticated USING (public.has_company_access(auth.uid(), id));
CREATE POLICY "empresas create" ON public.empresas FOR INSERT TO authenticated WITH CHECK (criada_por = auth.uid());
CREATE POLICY "empresas admin update" ON public.empresas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), id, 'admin'));

CREATE POLICY "members read own company" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_company_access(auth.uid(), empresa_id));
CREATE POLICY "members self insert on empresa create" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), empresa_id, 'admin'));
CREATE POLICY "members admin delete" ON public.company_members FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), empresa_id, 'admin') OR user_id = auth.uid());

CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), empresa_id, 'admin'));
CREATE POLICY "roles self bootstrap" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), empresa_id, 'admin'));
CREATE POLICY "roles admin update" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), empresa_id, 'admin'));
CREATE POLICY "roles admin delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), empresa_id, 'admin'));

-- ============ Trigger: cria profile no signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ OBRAS ============
CREATE TABLE public.obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  endereco text,
  responsavel_id uuid REFERENCES auth.users(id),
  orcamento numeric(14,2) NOT NULL DEFAULT 0,
  data_inicio date,
  data_fim_prevista date,
  status public.obra_status NOT NULL DEFAULT 'planejada',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obras TO authenticated;
GRANT ALL ON public.obras TO service_role;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_obras_upd BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "obras company access" ON public.obras FOR ALL TO authenticated
  USING (public.has_company_access(auth.uid(), empresa_id))
  WITH CHECK (public.has_company_access(auth.uid(), empresa_id));

-- ============ FORNECEDORES ============
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cnpj_cpf text,
  telefone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_forn_upd BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "fornecedores company access" ON public.fornecedores FOR ALL TO authenticated
  USING (public.has_company_access(auth.uid(), empresa_id))
  WITH CHECK (public.has_company_access(auth.uid(), empresa_id));

-- ============ CATEGORIAS ============
CREATE TABLE public.categorias_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text DEFAULT '#2F5D3A',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_custo TO authenticated;
GRANT ALL ON public.categorias_custo TO service_role;
ALTER TABLE public.categorias_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat company access" ON public.categorias_custo FOR ALL TO authenticated
  USING (public.has_company_access(auth.uid(), empresa_id))
  WITH CHECK (public.has_company_access(auth.uid(), empresa_id));

-- ============ NOTAS FISCAIS ============
CREATE TABLE public.notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome text,
  fornecedor_cnpj text,
  numero text,
  serie text,
  data_emissao date,
  valor_total numeric(14,2) DEFAULT 0,
  desconto numeric(14,2) DEFAULT 0,
  status public.nota_status NOT NULL DEFAULT 'pendente',
  origem public.nota_origem NOT NULL DEFAULT 'web',
  observacao text,
  criada_por uuid REFERENCES auth.users(id),
  aprovada_por uuid REFERENCES auth.users(id),
  aprovada_em timestamptz,
  hash_dedup text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_fiscais TO authenticated;
GRANT ALL ON public.notas_fiscais TO service_role;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_nf_upd BEFORE UPDATE ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE UNIQUE INDEX uq_nota_dedup ON public.notas_fiscais (empresa_id, hash_dedup) WHERE hash_dedup IS NOT NULL;
CREATE INDEX idx_nf_obra ON public.notas_fiscais (obra_id);
CREATE INDEX idx_nf_status ON public.notas_fiscais (empresa_id, status);
CREATE POLICY "nf company access" ON public.notas_fiscais FOR ALL TO authenticated
  USING (public.has_company_access(auth.uid(), empresa_id))
  WITH CHECK (public.has_company_access(auth.uid(), empresa_id));

-- ============ ITENS DA NOTA ============
CREATE TABLE public.itens_nota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES public.categorias_custo(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  quantidade numeric(14,3) NOT NULL DEFAULT 1,
  unidade text,
  valor_unitario numeric(14,4) NOT NULL DEFAULT 0,
  valor_total numeric(14,2) NOT NULL DEFAULT 0,
  confianca numeric(3,2),
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_nota TO authenticated;
GRANT ALL ON public.itens_nota TO service_role;
ALTER TABLE public.itens_nota ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_itens_nota ON public.itens_nota (nota_id);
CREATE POLICY "itens via nota" ON public.itens_nota FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND public.has_company_access(auth.uid(), n.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND public.has_company_access(auth.uid(), n.empresa_id)));

-- ============ ANEXOS ============
CREATE TABLE public.anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  bucket text NOT NULL DEFAULT 'notas-fiscais',
  path text NOT NULL,
  mime text,
  tamanho int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anexos TO authenticated;
GRANT ALL ON public.anexos TO service_role;
ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anexos via nota" ON public.anexos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND public.has_company_access(auth.uid(), n.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND public.has_company_access(auth.uid(), n.empresa_id)));

-- ============ IA EXTRACOES & CORRECOES ============
CREATE TABLE public.ia_extracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  payload_bruto jsonb NOT NULL,
  modelo text,
  custo_tokens int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ia_extracoes TO authenticated;
GRANT ALL ON public.ia_extracoes TO service_role;
ALTER TABLE public.ia_extracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia via nota" ON public.ia_extracoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND public.has_company_access(auth.uid(), n.empresa_id)));
CREATE POLICY "ia insert via nota" ON public.ia_extracoes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND public.has_company_access(auth.uid(), n.empresa_id)));

CREATE TABLE public.ia_correcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  campo text NOT NULL,
  valor_antigo text,
  valor_novo text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ia_correcoes TO authenticated;
GRANT ALL ON public.ia_correcoes TO service_role;
ALTER TABLE public.ia_correcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corr via nota" ON public.ia_correcoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND public.has_company_access(auth.uid(), n.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND public.has_company_access(auth.uid(), n.empresa_id)));

-- ============ WHATSAPP ============
CREATE TABLE public.whatsapp_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  telefone_e164 text NOT NULL,
  profile_id uuid REFERENCES public.profiles(id),
  nome_exibicao text,
  obra_padrao_id uuid REFERENCES public.obras(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, telefone_e164)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_contatos TO authenticated;
GRANT ALL ON public.whatsapp_contatos TO service_role;
ALTER TABLE public.whatsapp_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa contatos company" ON public.whatsapp_contatos FOR ALL TO authenticated
  USING (public.has_company_access(auth.uid(), empresa_id))
  WITH CHECK (public.has_company_access(auth.uid(), empresa_id));

CREATE TABLE public.whatsapp_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id uuid NOT NULL REFERENCES public.whatsapp_contatos(id) ON DELETE CASCADE,
  direcao public.wa_direcao NOT NULL,
  wa_message_id text,
  tipo text,
  conteudo jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.whatsapp_mensagens TO authenticated;
GRANT ALL ON public.whatsapp_mensagens TO service_role;
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa msg via contato" ON public.whatsapp_mensagens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.whatsapp_contatos c WHERE c.id = contato_id AND public.has_company_access(auth.uid(), c.empresa_id)));

CREATE TABLE public.whatsapp_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id uuid NOT NULL REFERENCES public.whatsapp_contatos(id) ON DELETE CASCADE,
  estado public.wa_estado NOT NULL DEFAULT 'ocioso',
  nota_id uuid REFERENCES public.notas_fiscais(id),
  obra_id uuid REFERENCES public.obras(id),
  expira_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_sessoes TO authenticated;
GRANT ALL ON public.whatsapp_sessoes TO service_role;
ALTER TABLE public.whatsapp_sessoes ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT ============
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  entidade text NOT NULL,
  entidade_id uuid,
  acao text NOT NULL,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit company read" ON public.audit_log FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR public.has_company_access(auth.uid(), empresa_id));
CREATE POLICY "audit insert authed" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============ STORAGE policies para bucket notas-fiscais ============
CREATE POLICY "nf storage read company" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND EXISTS (
    SELECT 1 FROM public.anexos a
    JOIN public.notas_fiscais n ON n.id = a.nota_id
    WHERE a.path = storage.objects.name
      AND public.has_company_access(auth.uid(), n.empresa_id)
  )
);
CREATE POLICY "nf storage insert authed" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'notas-fiscais' AND auth.uid() IS NOT NULL);
CREATE POLICY "nf storage delete owner" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND EXISTS (
    SELECT 1 FROM public.anexos a
    JOIN public.notas_fiscais n ON n.id = a.nota_id
    WHERE a.path = storage.objects.name
      AND public.has_company_access(auth.uid(), n.empresa_id)
  )
);
