export const permissionGroups = [
  {
    name: 'Administração',
    permissions: [
      {
        key: 'canManageTeam',
        label: 'Gerenciar Equipe',
        description: 'Convidar, editar e desativar funcionários',
        explanation: 'Habilitado: Pode convidar membros, editar perfis e desativar contas. Desabilitado: Não tem acesso à gestão de pessoas.'
      },
      {
        key: 'canManageSettings',
        label: 'Configurações da Empresa',
        description: 'Alterar logo, cores e dados do escritório',
        explanation: 'Habilitado: Pode alterar branding e dados fiscais da empresa. Desabilitado: Configurações ficam ocultas.'
      },
      {
        key: 'canManageKanban',
        label: 'Gerenciar Kanban',
        description: 'Criar, editar e reordenar colunas',
        explanation: 'Habilitado: Pode alterar a estrutura visual do fluxo de trabalho. Desabilitado: Utiliza o fluxo fixo definido.'
      },
      {
        key: 'canExportData',
        label: 'Exportar Dados',
        description: 'Exportar relatórios e planilhas de clientes',
        explanation: 'Habilitado: Permite baixar relatórios consolidados em Excel/PDF. Desabilitado: Botão de exportação fica oculto.'
      },
    ]
  },
  {
    name: 'Operação de IR',
    permissions: [
      {
        key: 'canCreateIR',
        label: 'Criar Novos Cards',
        description: 'Iniciar novas declarações para clientes',
        explanation: 'Habilitado: Pode abrir novos processos para clientes. Desabilitado: Não pode iniciar novos serviços.'
      },
      {
        key: 'canEditIR',
        label: 'Editar Informações',
        description: 'Alterar dados de declarações existentes',
        explanation: 'Habilitado: Permite alterar qualquer dado de um IR aberto. Desabilitado: Vê as declarações em modo leitura.'
      },
      {
        key: 'canMoveToFinalColumn',
        label: 'Concluir Declarações',
        description: 'Mover cards para a coluna final (Transmitidas)',
        explanation: 'Habilitado: Tem autoridade para dar baixa no serviço. Desabilitado: O card trava antes da etapa final para revisão.'
      },
      {
        key: 'canImportDocs',
        label: 'Importar Documentos Oficiais',
        description: 'Realizar importações automáticas de órgãos oficiais',
        explanation: 'Habilitado: Pode usar créditos para buscar dados no e-CAC/Receita. Desabilitado: Função de importação bloqueada.'
      },
      {
        key: 'canManageChecklist',
        label: 'Configurar Checklist',
        description: 'Definir o que o cliente precisa enviar no onboarding',
        explanation: 'Habilitado: Pode personalizar o checklist padrão da empresa. Desabilitado: Segue o fluxo fixo.'
      },
      {
        key: 'canApproveChecklist',
        label: 'Revisar Documentos',
        description: 'Aprovar ou rejeitar documentos de clientes',
        explanation: 'Habilitado: Pode dar baixa ou recusar arquivos enviados no IR. Desabilitado: Apenas visualiza os arquivos.'
      },
      {
        key: 'canDeleteRecords',
        label: 'Excluir Registros',
        description: 'Excluir declarações ou arquivos permanentemente',
        explanation: 'Habilitado: Pode apagar dados do sistema (Ação irreversível). Desabilitado: Não pode excluir nada.'
      },
    ]
  },
  {
    name: 'Acesso e Visualização',
    permissions: [
      {
        key: 'canManageClients',
        label: 'Gerenciar Clientes',
        description: 'Acesso completo ao cadastro de clientes',
        explanation: 'Habilitado: Pode editar dados de contato e documentos do cliente. Desabilitado: Vê apenas informações básicas.'
      },
      {
        key: 'canViewAllCards',
        label: 'Visualizar Todos os Cards',
        description: 'Ver declarações mesmo que não estejam atribuídas a ele',
        explanation: 'Habilitado: Visão macro da empresa. Desabilitado: Só vê os próprios clientes que está atendendo.'
      },
      {
        key: 'canViewFinancialCharts',
        label: 'Dashboard Financeiro',
        description: 'Visualizar gráficos de faturamento e produtividade',
        explanation: 'Habilitado: Vê métricas de lucro e performance da equipe. Desabilitado: Dashboard fica oculto.'
      },
    ]
  },
  {
    name: 'Drive',
    permissions: [
      {
        key: 'canViewDrive',
        label: 'Acessar Drive',
        description: 'Visualizar aba de arquivos centralizada',
        explanation: 'Habilitado: Vê o menu Drive. Desabilitado: A aba Drive é removida do acesso do colaborador.'
      },
      {
        key: 'canViewAllFilesDrive',
        label: 'Visualizar Todos os Arquivos',
        description: 'Permite ver arquivos de todos os clientes da empresa',
        explanation: 'Habilitado: Acesso colaborativo total ao Drive. Desabilitado: Só vê arquivos de clientes sob sua responsabilidade.'
      },
    ]
  }
]
