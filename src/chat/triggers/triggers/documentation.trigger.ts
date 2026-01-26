import { Injectable } from '@nestjs/common';
import {
  ITrigger,
  TriggerConfig,
  TriggerProcessResult,
  TriggerPrompt,
} from '../interfaces/trigger.interface';

/**
 * Trigger para documentação e ajuda sobre o sistema
 * 
 * Esta trigger é ativada quando o usuário pergunta sobre funcionalidades,
 * como usar telas, módulos ou recursos do sistema.
 * 
 * A documentação pode ser carregada de arquivos externos ou configurada aqui.
 */
@Injectable()
export class DocumentationTrigger implements ITrigger {
  config: TriggerConfig = {
    id: 'system-documentation',
    name: 'Documentação do Sistema',
    description: 'Trigger para ajuda e documentação sobre o sistema',
    keywords: [
      { word: 'como funciona', weight: 10 },
      { word: 'como usar', weight: 10 },
      { word: 'ajuda', weight: 8 },
      { word: 'tutorial', weight: 10 },
      { word: 'me ensina', weight: 10 },
      { word: 'me explica', weight: 8 },
      { word: 'onde fica', weight: 8 },
      { word: 'como faço', weight: 10 },
      { word: 'como faz', weight: 10 },
      { word: 'não sei usar', weight: 12 },
      { word: 'não entendo', weight: 8 },
      { word: 'dúvida sobre', weight: 8 },
      { word: 'duvida sobre', weight: 8 },
      { word: 'o que é', weight: 6 },
      { word: 'o que significa', weight: 6 },
      { word: 'para que serve', weight: 8 },
      { word: 'funcionalidade', weight: 6 },
      { word: 'módulo', weight: 5 },
      { word: 'modulo', weight: 5 },
      { word: 'tela', weight: 5 },
      { word: 'botão', weight: 4 },
      { word: 'menu', weight: 4 },
      { word: 'sistema', weight: 3 },
    ],
    minScore: 6,
    priority: 2,
    active: true,
    canStack: false,
  };

  /**
   * Mapeamento de módulos do sistema para documentação
   * Cada chave representa um módulo e contém suas palavras-chave e documentação
   */
  private moduleDocumentation: Record<string, ModuleDoc> = {
    dashboard: {
      keywords: ['dashboard', 'painel', 'inicio', 'início', 'home', 'página inicial'],
      name: 'Dashboard',
      description: 'Painel principal do sistema com visão geral das informações.',
      documentation: `
## Dashboard - Painel Principal

O Dashboard é a tela inicial do sistema, onde você encontra uma visão geral de todas as informações importantes.

### O que você encontra no Dashboard:
- **Resumo de pacientes**: Quantidade total de pacientes cadastrados
- **Atendimentos do dia**: Lista de atendimentos agendados para hoje
- **Notificações**: Alertas e avisos importantes
- **Atalhos rápidos**: Acesso rápido às funções mais usadas

### Como usar:
1. Ao fazer login, você será direcionado automaticamente para o Dashboard
2. Use os cards para ver informações resumidas
3. Clique nos atalhos para acessar outras funcionalidades rapidamente
      `,
    },
    forms: {
      keywords: ['formulário', 'formularios', 'forms', 'questionário', 'triagem', 'perguntas'],
      name: 'Formulários',
      description: 'Módulo de criação e gerenciamento de formulários de triagem.',
      documentation: `
## Módulo de Formulários

O módulo de formulários permite criar, editar e gerenciar formulários de triagem médica.

### Funcionalidades:
- **Criar formulário**: Use o assistente de IA para criar formulários automaticamente
- **Editar formulário**: Modifique perguntas, opções e regras de pontuação
- **Visualizar respostas**: Veja todas as respostas coletadas
- **Exportar dados**: Exporte as respostas em formato de planilha

### Como criar um formulário:
1. Acesse o menu "Formulários"
2. Clique em "Novo Formulário" ou use o chat com IA
3. Descreva o tipo de formulário que precisa
4. Revise e confirme a criação

### Tipos de perguntas:
- **Múltipla escolha**: Apenas uma opção pode ser selecionada
- **Checkboxes**: Várias opções podem ser selecionadas
      `,
    },
    patients: {
      keywords: ['paciente', 'pacientes', 'cadastro', 'prontuário', 'prontuario'],
      name: 'Pacientes',
      description: 'Módulo de cadastro e gerenciamento de pacientes.',
      documentation: `
## Módulo de Pacientes

O módulo de pacientes permite gerenciar todos os pacientes cadastrados no sistema.

### Funcionalidades:
- **Cadastrar paciente**: Adicionar novos pacientes ao sistema
- **Buscar paciente**: Encontrar pacientes por nome, CPF ou outros dados
- **Editar cadastro**: Atualizar informações do paciente
- **Histórico**: Ver histórico de atendimentos e formulários respondidos

### Como cadastrar um paciente:
1. Acesse o menu "Pacientes"
2. Clique em "Novo Paciente"
3. Preencha os dados obrigatórios
4. Clique em "Salvar"
      `,
    },
    appointments: {
      keywords: ['agendamento', 'agenda', 'consulta', 'marcar', 'horário', 'horario'],
      name: 'Agendamentos',
      description: 'Módulo de agendamento de consultas e atendimentos.',
      documentation: `
## Módulo de Agendamentos

O módulo de agendamentos permite gerenciar a agenda de consultas e atendimentos.

### Funcionalidades:
- **Agendar consulta**: Marcar novas consultas para pacientes
- **Visualizar agenda**: Ver todos os agendamentos do dia/semana/mês
- **Cancelar/Remarcar**: Modificar agendamentos existentes
- **Notificações**: Enviar lembretes para pacientes

### Como agendar uma consulta:
1. Acesse o menu "Agendamentos"
2. Clique no horário desejado na agenda
3. Selecione o paciente
4. Confirme o agendamento
      `,
    },
    notifications: {
      keywords: ['notificação', 'notificações', 'alerta', 'avisos', 'push', 'mensagem'],
      name: 'Notificações',
      description: 'Módulo de envio de notificações e alertas.',
      documentation: `
## Módulo de Notificações

O módulo de notificações permite enviar alertas e comunicados para os usuários.

### Tipos de notificações:
- **Push**: Notificações que aparecem no dispositivo
- **In-app**: Notificações dentro do sistema
- **Email**: Envio de emails (quando configurado)

### Como enviar notificações:
1. Acesse o menu "Notificações"
2. Selecione o tipo de notificação
3. Escolha os destinatários
4. Escreva a mensagem
5. Clique em "Enviar"
      `,
    },
  };

  prompt: TriggerPrompt = {
    systemPrompt: `Você é um assistente especializado em ajudar usuários a entender e usar o sistema de saúde pública.

Seu papel é:
1. Explicar como usar as funcionalidades do sistema de forma clara e simples
2. Guiar o usuário passo a passo quando necessário
3. Responder dúvidas sobre módulos, telas e recursos
4. Usar linguagem acessível e amigável

DOCUMENTAÇÃO DISPONÍVEL:
{{DOCUMENTATION}}

REGRAS:
- Sempre seja claro e objetivo
- Use exemplos práticos quando possível
- Se não souber sobre algo específico, diga que pode ajudar a encontrar a informação
- Não invente funcionalidades que não existem
- Sugira outras funcionalidades relacionadas quando apropriado

Responda de forma conversacional, como se estivesse explicando para um colega de trabalho.`,
    temperature: 0.6,
    maxTokens: 1024,
  };

  checkActivation(message: string, conversationHistory?: any[]): number {
    const lowerMessage = message.toLowerCase();
    let score = 0;

    // Verificar palavras-chave gerais de ajuda
    for (const keyword of this.config.keywords) {
      if (lowerMessage.includes(keyword.word.toLowerCase())) {
        score += keyword.weight;
      }
    }

    // Verificar se menciona algum módulo específico
    for (const moduleKey of Object.keys(this.moduleDocumentation)) {
      const module = this.moduleDocumentation[moduleKey];
      for (const keyword of module.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          score += 5; // Bonus por mencionar módulo específico
          break;
        }
      }
    }

    // Verificar contexto do histórico
    if (conversationHistory && conversationHistory.length > 0) {
      const lastMessages = conversationHistory.slice(-2);
      for (const msg of lastMessages) {
        const content = msg.content?.toLowerCase() || '';
        if (
          content.includes('ajuda') ||
          content.includes('como') ||
          content.includes('tutorial')
        ) {
          score += 3;
          break;
        }
      }
    }

    return score;
  }

  /**
   * Obtém o prompt com a documentação relevante baseada na mensagem e contexto
   */
  getPromptWithDocumentation(message: string, conversationHistory?: any[]): TriggerPrompt {
    const lowerMessage = message.toLowerCase();
    let relevantDocs: string[] = [];
    const documentationModules = new Set<string>();

    // Analisar o contexto da conversa para entender melhor o tópico
    const contextMessages: string[] = [lowerMessage];
    if (conversationHistory && conversationHistory.length > 0) {
      // Pegar as últimas 3 mensagens para contexto
      const recentMessages = conversationHistory.slice(-3);
      for (const msg of recentMessages) {
        if (msg.content) {
          contextMessages.push(msg.content.toLowerCase());
        }
      }
    }

    // Encontrar documentação relevante baseada no contexto completo
    for (const moduleKey of Object.keys(this.moduleDocumentation)) {
      const module = this.moduleDocumentation[moduleKey];
      for (const contextMsg of contextMessages) {
        for (const keyword of module.keywords) {
          if (contextMsg.includes(keyword.toLowerCase())) {
            documentationModules.add(moduleKey);
            break;
          }
        }
      }
    }

    // Adicionar documentação dos módulos encontrados
    for (const moduleKey of documentationModules) {
      relevantDocs.push(this.moduleDocumentation[moduleKey].documentation);
    }

    // Se não encontrou documentação específica, incluir um resumo geral
    if (relevantDocs.length === 0) {
      relevantDocs.push(this.getGeneralOverview());
    }

    const documentation = relevantDocs.join('\n\n---\n\n');
    const systemPrompt = this.prompt.systemPrompt.replace(
      '{{DOCUMENTATION}}',
      documentation,
    );

    return {
      ...this.prompt,
      systemPrompt,
    };
  }

  private getGeneralOverview(): string {
    let overview = '## Visão Geral do Sistema\n\nMódulos disponíveis:\n';
    
    for (const moduleKey of Object.keys(this.moduleDocumentation)) {
      const module = this.moduleDocumentation[moduleKey];
      overview += `\n- **${module.name}**: ${module.description}`;
    }
    
    return overview;
  }

  /**
   * Adiciona ou atualiza documentação de um módulo
   */
  addModuleDocumentation(
    key: string,
    keywords: string[],
    name: string,
    description: string,
    documentation: string,
  ): void {
    this.moduleDocumentation[key] = {
      keywords,
      name,
      description,
      documentation,
    };
  }

  async processResponse(
    response: string,
    context?: any,
  ): Promise<TriggerProcessResult> {
    // Documentação não precisa de processamento especial
    return { success: true, responseText: response };
  }
}

interface ModuleDoc {
  keywords: string[];
  name: string;
  description: string;
  documentation: string;
}
