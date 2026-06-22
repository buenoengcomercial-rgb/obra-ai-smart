export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anexos: {
        Row: {
          bucket: string
          created_at: string
          id: string
          mime: string | null
          nota_id: string
          path: string
          tamanho: number | null
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          mime?: string | null
          nota_id: string
          path: string
          tamanho?: number | null
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          mime?: string | null
          nota_id?: string
          path?: string
          tamanho?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anexos_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          diff: Json | null
          empresa_id: string | null
          entidade: string
          entidade_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          diff?: Json | null
          empresa_id?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          diff?: Json | null
          empresa_id?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_custo: {
        Row: {
          cor: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_custo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          created_at: string
          empresa_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          criada_por: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          criada_por?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          criada_por?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          cnpj_cpf: string | null
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_correcoes: {
        Row: {
          campo: string
          created_at: string
          id: string
          nota_id: string
          user_id: string | null
          valor_antigo: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          created_at?: string
          id?: string
          nota_id: string
          user_id?: string | null
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          created_at?: string
          id?: string
          nota_id?: string
          user_id?: string | null
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_correcoes_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_extracoes: {
        Row: {
          created_at: string
          custo_tokens: number | null
          id: string
          modelo: string | null
          nota_id: string
          payload_bruto: Json
        }
        Insert: {
          created_at?: string
          custo_tokens?: number | null
          id?: string
          modelo?: string | null
          nota_id: string
          payload_bruto: Json
        }
        Update: {
          created_at?: string
          custo_tokens?: number | null
          id?: string
          modelo?: string | null
          nota_id?: string
          payload_bruto?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ia_extracoes_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_nota: {
        Row: {
          categoria_id: string | null
          confianca: number | null
          created_at: string
          descricao: string
          id: string
          nota_id: string
          ordem: number
          quantidade: number
          unidade: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          categoria_id?: string | null
          confianca?: number | null
          created_at?: string
          descricao: string
          id?: string
          nota_id: string
          ordem?: number
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          categoria_id?: string | null
          confianca?: number | null
          created_at?: string
          descricao?: string
          id?: string
          nota_id?: string
          ordem?: number
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_nota_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_nota_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          aprovada_em: string | null
          aprovada_por: string | null
          created_at: string
          criada_por: string | null
          data_emissao: string | null
          desconto: number | null
          empresa_id: string
          fornecedor_cnpj: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          hash_dedup: string | null
          id: string
          numero: string | null
          obra_id: string | null
          observacao: string | null
          origem: Database["public"]["Enums"]["nota_origem"]
          serie: string | null
          status: Database["public"]["Enums"]["nota_status"]
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          created_at?: string
          criada_por?: string | null
          data_emissao?: string | null
          desconto?: number | null
          empresa_id: string
          fornecedor_cnpj?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          hash_dedup?: string | null
          id?: string
          numero?: string | null
          obra_id?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["nota_origem"]
          serie?: string | null
          status?: Database["public"]["Enums"]["nota_status"]
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          created_at?: string
          criada_por?: string | null
          data_emissao?: string | null
          desconto?: number | null
          empresa_id?: string
          fornecedor_cnpj?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          hash_dedup?: string | null
          id?: string
          numero?: string | null
          obra_id?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["nota_origem"]
          serie?: string | null
          status?: Database["public"]["Enums"]["nota_status"]
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          created_at: string
          data_fim_prevista: string | null
          data_inicio: string | null
          empresa_id: string
          endereco: string | null
          id: string
          nome: string
          orcamento: number
          responsavel_id: string | null
          status: Database["public"]["Enums"]["obra_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio?: string | null
          empresa_id: string
          endereco?: string | null
          id?: string
          nome: string
          orcamento?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome?: string
          orcamento?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contatos: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nome_exibicao: string | null
          obra_padrao_id: string | null
          profile_id: string | null
          telefone_e164: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nome_exibicao?: string | null
          obra_padrao_id?: string | null
          profile_id?: string | null
          telefone_e164: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nome_exibicao?: string | null
          obra_padrao_id?: string | null
          profile_id?: string | null
          telefone_e164?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contatos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contatos_obra_padrao_id_fkey"
            columns: ["obra_padrao_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contatos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_mensagens: {
        Row: {
          contato_id: string
          conteudo: Json | null
          created_at: string
          direcao: Database["public"]["Enums"]["wa_direcao"]
          id: string
          tipo: string | null
          wa_message_id: string | null
        }
        Insert: {
          contato_id: string
          conteudo?: Json | null
          created_at?: string
          direcao: Database["public"]["Enums"]["wa_direcao"]
          id?: string
          tipo?: string | null
          wa_message_id?: string | null
        }
        Update: {
          contato_id?: string
          conteudo?: Json | null
          created_at?: string
          direcao?: Database["public"]["Enums"]["wa_direcao"]
          id?: string
          tipo?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessoes: {
        Row: {
          contato_id: string
          estado: Database["public"]["Enums"]["wa_estado"]
          expira_em: string | null
          id: string
          nota_id: string | null
          obra_id: string | null
          updated_at: string
        }
        Insert: {
          contato_id: string
          estado?: Database["public"]["Enums"]["wa_estado"]
          expira_em?: string | null
          id?: string
          nota_id?: string | null
          obra_id?: string | null
          updated_at?: string
        }
        Update: {
          contato_id?: string
          estado?: Database["public"]["Enums"]["wa_estado"]
          expira_em?: string | null
          id?: string
          nota_id?: string | null
          obra_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessoes_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_company_access: {
        Args: { _empresa: string; _user: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _empresa: string
          _role: Database["public"]["Enums"]["app_role"]
          _user: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "apontador"
      nota_origem: "web" | "whatsapp"
      nota_status: "pendente" | "em_conferencia" | "aprovada" | "rejeitada"
      obra_status: "planejada" | "em_andamento" | "pausada" | "concluida"
      wa_direcao: "in" | "out"
      wa_estado: "aguardando_obra" | "aguardando_confirmacao" | "ocioso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "apontador"],
      nota_origem: ["web", "whatsapp"],
      nota_status: ["pendente", "em_conferencia", "aprovada", "rejeitada"],
      obra_status: ["planejada", "em_andamento", "pausada", "concluida"],
      wa_direcao: ["in", "out"],
      wa_estado: ["aguardando_obra", "aguardando_confirmacao", "ocioso"],
    },
  },
} as const
