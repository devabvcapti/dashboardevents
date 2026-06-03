import { requireAuth } from '@/lib/auth'
import {
  BookOpen, LogIn, LayoutDashboard, Users, TicketIcon, Tag,
  BarChart3, Activity, Wallet, PiggyBank, Calendar, Upload,
  UserCog, ShieldCheck, FileSpreadsheet, AlertTriangle,
} from 'lucide-react'

export const metadata = { title: 'Manual — Dashboard ABVCAP' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </section>
  )
}

function ModuleCard({
  icon: Icon,
  label,
  path,
  description,
  adminOnly,
}: {
  icon: React.ElementType
  label: string
  path: string
  description: string
  adminOnly?: boolean
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        {adminOnly && (
          <span className="text-[9px] font-mono tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 uppercase">
            Admin
          </span>
        )}
      </div>
      <p className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">{path}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-mono font-semibold text-primary">
        {n}
      </div>
      <p className="text-sm text-muted-foreground pt-0.5">{children}</p>
    </div>
  )
}

export default async function ManualPage() {
  await requireAuth()

  return (
    <div className="p-8 space-y-10 max-w-4xl">

      {/* Header */}
      <div className="border-b border-border pb-6">
        <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase mb-1">
          Documentação
        </p>
        <h1 className="font-display text-3xl text-foreground leading-none">Manual do Sistema</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Guia completo de uso do Dashboard Eventos ABVCAP — acesso, navegação e funcionalidades.
        </p>
      </div>

      {/* Acesso */}
      <Section title="1. Acesso ao Sistema">
        <p className="text-sm text-muted-foreground">
          O Dashboard Eventos é restrito a colaboradores autorizados da ABVCAP. Existem dois métodos de login:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-lg p-4 bg-card space-y-2">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Entrar com Microsoft</span>
              <span className="text-[9px] font-mono tracking-widest text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 uppercase">Recomendado</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Clique no botão "Entrar com Microsoft" e use sua conta corporativa <strong>@abvcap.com.br</strong>. Não é necessário lembrar de senha.
            </p>
          </div>
          <div className="border border-border rounded-lg p-4 bg-card space-y-2">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Email e Senha</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Insira o email e senha cadastrados diretamente no sistema. Apenas para contas sem SSO Microsoft configurado.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            O acesso é restrito a contas autorizadas pelo administrador. Caso receba "Acesso não autorizado", entre em contato com o TI.
          </p>
        </div>
      </Section>

      {/* Módulos */}
      <Section title="2. Módulos do Dashboard">
        <p className="text-sm text-muted-foreground">
          O menu lateral dá acesso a todos os módulos. Os marcados como <strong>Admin</strong> são visíveis apenas para administradores.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ModuleCard
            icon={LayoutDashboard}
            label="Visão Geral"
            path="/dashboard"
            description="KPIs principais da edição ativa: total de inscritos, membros, receita, ticket médio, empresas e estados representados."
          />
          <ModuleCard
            icon={Users}
            label="Inscrições"
            path="/dashboard/inscricoes"
            description="Lista completa de participantes com filtros por tipo de membro, segmento e status de pagamento. Exportação em Excel disponível."
          />
          <ModuleCard
            icon={TicketIcon}
            label="Ingressos"
            path="/dashboard/ingressos"
            description="Distribuição dos tipos de ingresso adquiridos: gráficos de participação por categoria e segmento corporativo."
          />
          <ModuleCard
            icon={Tag}
            label="Cupons"
            path="/dashboard/cupons"
            description="Análise dos cupons de desconto aplicados: contagem por código, desconto total estimado e ranking de empresas."
          />
          <ModuleCard
            icon={BarChart3}
            label="Análise de Público"
            path="/dashboard/publico"
            description="Perfil dos participantes: cargo, porte da empresa, segmento, estado de origem, restrições alimentares e temas de interesse (Congresso e VC Day)."
          />
          <ModuleCard
            icon={Activity}
            label="Ritmo de Inscrições"
            path="/dashboard/ritmo"
            description="Evolução temporal das inscrições: barras diárias, linha acumulada, marcos de 25/50/75/100% e pico diário."
          />
          <ModuleCard
            icon={Wallet}
            label="Análise de Receita"
            path="/dashboard/receita"
            description="Visão financeira: receita por tipo de membro, histograma de distribuição de valores e comparativo de ticket médio."
          />
          <ModuleCard
            icon={Calendar}
            label="Eventos"
            path="/dashboard/eventos"
            description="Criação e exclusão de edições do evento. A edição ativa é selecionada no seletor no topo da sidebar."
            adminOnly
          />
          <ModuleCard
            icon={PiggyBank}
            label="Orçamento"
            path="/dashboard/orcamento"
            description="Painel financeiro orçado × realizado: gauge de execução, barras por categoria e tabela com semáforo verde/amarelo/vermelho."
            adminOnly
          />
          <ModuleCard
            icon={Upload}
            label="Importar"
            path="/dashboard/import"
            description="Upload da planilha Excel de inscrições com pré-visualização de dados, mapeamento de colunas e confirmação antes do commit."
            adminOnly
          />
          <ModuleCard
            icon={UserCog}
            label="Usuários"
            path="/dashboard/usuarios"
            description="Gerenciamento de roles: promova usuários de viewer para admin ou rebaixe conforme necessário."
            adminOnly
          />
        </div>
      </Section>

      {/* Importar planilha */}
      <Section title="3. Como Importar a Planilha de Inscrições">
        <p className="text-sm text-muted-foreground">
          A importação lê o arquivo Excel exportado da plataforma de inscrições e popula os dados da edição ativa.
        </p>
        <div className="space-y-3">
          <Step n={1}>Acesse <strong>Importar</strong> no menu lateral (área Admin).</Step>
          <Step n={2}>Clique em <strong>Selecionar arquivo</strong> e escolha o <code>.xlsx</code> exportado da plataforma.</Step>
          <Step n={3}>O sistema exibe uma pré-visualização com as primeiras linhas. Verifique se as colunas foram mapeadas corretamente — campos detectados automaticamente incluem nome, email, CPF, empresa, tipo de ingresso, valor e cupom.</Step>
          <Step n={4}>Se alguma coluna não foi detectada, ajuste o mapeamento manualmente pelo seletor de cada coluna.</Step>
          <Step n={5}>Clique em <strong>Confirmar importação</strong>. Os dados são inseridos ou atualizados na edição ativa (upsert por email + edição).</Step>
          <Step n={6}>Um resumo é exibido ao final: linhas inseridas, atualizadas e com erro.</Step>
        </div>
        <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
          <FileSpreadsheet className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-400">
            O parser detecta automaticamente as colunas do VC Day e campos de ingresso mesmo quando a planilha tem colunas extras ou reordenadas.
          </p>
        </div>
      </Section>

      {/* Importar orçamento */}
      <Section title="4. Como Importar a Planilha de Orçamento">
        <p className="text-sm text-muted-foreground">
          O módulo de Orçamento aceita um Excel com colunas de categoria, subcategoria, valor orçado e valor realizado.
        </p>
        <div className="space-y-3">
          <Step n={1}>Acesse <strong>Orçamento</strong> no menu lateral.</Step>
          <Step n={2}>Clique em <strong>Importar planilha</strong> e selecione o arquivo <code>.xlsx</code>.</Step>
          <Step n={3}>O sistema detecta automaticamente a linha de cabeçalho e as colunas pelo nome (Categoria, Orçado, Realizado).</Step>
          <Step n={4}>Os dados anteriores da edição são substituídos pelos da nova planilha.</Step>
        </div>
        <div className="border border-border rounded-lg p-3 bg-muted/20">
          <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-widest">Colunas esperadas na planilha</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['Categoria', 'Subcategoria (opcional)', 'Orçado (R$)', 'Realizado (R$)'].map(col => (
              <span key={col} className="text-xs bg-background border border-border rounded px-2 py-1 font-mono text-foreground/70">{col}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* Perfis */}
      <Section title="5. Perfis de Acesso">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-lg p-4 bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Viewer</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Acesso de leitura a todos os módulos do dashboard. Pode visualizar dados, filtrar inscrições e exportar listas. Não tem acesso às funções administrativas.
            </p>
          </div>
          <div className="border border-border rounded-lg p-4 bg-card space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Admin</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Todas as permissões do Viewer, mais: criar e excluir edições, importar planilhas de inscrições e orçamento, e gerenciar os roles de outros usuários.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Novos usuários que fazem login pela primeira vez recebem automaticamente o perfil <strong>Viewer</strong>. Um administrador pode promovê-los para <strong>Admin</strong> na página Usuários.
        </p>
      </Section>

      {/* Footer */}
      <div className="border-t border-border pt-6 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-muted-foreground/40" />
        <p className="text-xs font-mono text-muted-foreground/40 tracking-wider uppercase">
          Dashboard Eventos ABVCAP · Suporte: ti@abvcap.com.br
        </p>
      </div>

    </div>
  )
}
