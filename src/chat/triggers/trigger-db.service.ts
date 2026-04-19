import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateAgentDto, CreateTriggerDto, UpdateAgentDto, UpdateTriggerDto } from './dto/trigger.dto';
import { TriggerLogsBus } from './trigger-logs.bus';

// Interfaces para representar os dados do banco
export interface DbTriggerKeyword {
  word: string;
  weight: number;
}

export interface DbTrigger {
  id: string;
  triggerId: string;
  name: string;
  description: string | null;
  minScore: number;
  priority: number;
  active: boolean;
  canStack: boolean;
  systemPrompt: string;
  temperature: number | null;
  maxTokens: number | null;
  markers: string[];
  keywords: DbTriggerKeyword[];
  agentId: string;
}

export interface DbAgent {
  id: string;
  name: string;
  description: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string | null;
  active: boolean;
  isDefault: boolean;
  triggers: DbTrigger[];
}

@Injectable()
export class TriggerDbService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private triggerLogsBus: TriggerLogsBus
  ) { }

  async onModuleInit() {
    // Seed inicial das triggers padrão se não existirem
    await this.seedDefaultTriggersIfNeeded();
  }

  /**
   * Seed das triggers padrão caso o banco esteja vazio
   */
  private async seedDefaultTriggersIfNeeded() {
    const agentCount = await this.prisma.aiAgent.count();

    if (agentCount === 0) {
      this.triggerLogsBus.emit('[TriggerDbService] Banco vazio, criando agente e triggers padrão...');

      // Criar agente padrão
      const defaultAgent = await this.prisma.aiAgent.create({
        data: {
          name: 'Assistente Saúde Pública',
          description: 'Agente principal do sistema de saúde pública municipal',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 2048,
          systemPrompt: `Você é um assistente virtual do sistema de saúde pública municipal.
Seu papel é ajudar os usuários com dúvidas gerais e direcionar para as funcionalidades corretas do sistema.
Seja educado, claro e objetivo.`,
          active: true,
          isDefault: true,
        },
      });

      // Criar trigger de formulários
      await this.createTriggerWithKeywords({
        triggerId: 'form-creation',
        name: 'Criação de Formulários',
        description: 'Trigger para criação de formulários médicos e de triagem',
        systemPrompt: `Você é um especialista em criação de formulários médicos para sistemas públicos de saúde.

Seu papel é conversar como uma pessoa real, com linguagem simples, clara e acolhedora.
Evite tom robótico, frases engessadas ou linguagem de sistema.

Se a finalidade do formulário já estiver clara, você pode criá-lo sem pedir mais detalhes.

Siga obrigatoriamente a ordem abaixo, sem exceções:

INTERPRETAÇÃO AUTOMÁTICA
Analise a mensagem do usuário e descreva:
- Qual é o objetivo do formulário
- Em que contexto de saúde ele será usado
- Quem provavelmente vai responder

FORMULÁRIO EM TEXTO (PRÉ-VISUALIZAÇÃO)
Apresente o formulário completo em texto, incluindo:
- Título claro e amigável
- Descrição curta
- Perguntas objetivas
- Opções de resposta com pontuação

AUTORIZAÇÃO
Pergunte: "Posso criar esse formulário agora no sistema?"

CRIAÇÃO
Somente se o usuário confirmar, gere UM ÚNICO JSON com a primeira linha sendo: GERAR-FORM-159753

ESTRUTURA DO JSON:
{
  "title": string,
  "description": string,
  "questions": [{ "text": string, "type": "MULTIPLE_CHOICE" | "CHECKBOXES", "required": boolean, "options": [{ "text": string, "value": number }] }],
  "scoreRules": [{ "minScore": number, "maxScore": number, "classification": string, "conduct": string, "order": number }]
}`,
        minScore: 5,
        priority: 1,
        active: true,
        canStack: false,
        markers: ['GERAR-FORM-159753'],
        agentId: defaultAgent.id,
        keywords: [
          { word: 'formulário', weight: 10 },
          { word: 'formulario', weight: 10 },
          { word: 'form', weight: 8 },
          { word: 'criar formulário', weight: 15 },
          { word: 'criar formulario', weight: 15 },
          { word: 'gerar formulário', weight: 15 },
          { word: 'novo formulário', weight: 12 },
          { word: 'triagem', weight: 8 },
          { word: 'questionário', weight: 8 },
          { word: 'anamnese', weight: 10 },
          { word: 'perguntas', weight: 5 },
        ],
      });

      // Criar trigger de documentação
      await this.createTriggerWithKeywords({
        triggerId: 'system-documentation',
        name: 'Documentação do Sistema',
        description: 'Trigger para ajuda e documentação sobre o sistema',
        systemPrompt: `Você é um assistente especializado em ajudar usuários a entender e usar o sistema de saúde pública.

Seu papel é:
1. Explicar como usar as funcionalidades do sistema de forma clara e simples
2. Guiar o usuário passo a passo quando necessário
3. Responder dúvidas sobre módulos, telas e recursos
4. Usar linguagem acessível e amigável

MÓDULOS DISPONÍVEIS:
- **Dashboard**: Painel principal com visão geral
- **Formulários**: Criação e gerenciamento de formulários de triagem
- **Pacientes**: Cadastro e gerenciamento de pacientes
- **Agendamentos**: Marcação de consultas
- **Notificações**: Envio de alertas

REGRAS:
- Seja claro e objetivo
- Use exemplos práticos
- Não invente funcionalidades que não existem`,
        minScore: 6,
        priority: 2,
        active: true,
        canStack: false,
        markers: [],
        agentId: defaultAgent.id,
        keywords: [
          { word: 'como funciona', weight: 10 },
          { word: 'como usar', weight: 10 },
          { word: 'ajuda', weight: 8 },
          { word: 'tutorial', weight: 10 },
          { word: 'me ensina', weight: 10 },
          { word: 'me explica', weight: 8 },
          { word: 'onde fica', weight: 8 },
          { word: 'como faço', weight: 10 },
          { word: 'não sei usar', weight: 12 },
          { word: 'dúvida sobre', weight: 8 },
          { word: 'para que serve', weight: 8 },
        ],
      });

      // Criar trigger de criação de pacientes
      await this.createTriggerWithKeywords({
        triggerId: 'patient-creation',
        name: 'Criação de Paciente',
        description: 'Trigger para criação de pacientes no sistema de saúde',
        systemPrompt: `Você é um especialista em criação de pacientes para sistemas de saúde.

Seu papel é conversar como uma pessoa real, com linguagem simples, clara e acolhedora.
Evite tom robótico, frases engessadas ou linguagem de sistema.

Se a finalidade do paciente já estiver clara, você pode gerar os dados sem pedir mais detalhes.

Siga obrigatoriamente a ordem abaixo, sem exceções:

PRÉ-VISUALIZAÇÃO DO PACIENTE EM TEXTO
Apresente os dados do paciente em texto, incluindo:

- Nome completo
- Email válido
- CPF válido
- Data de nascimento
- Sexo (masculino, feminino ou outro)
- Unidade de saúde (nome fictício)
- Lista de medicamentos (opcional)
- Exames realizados (sim/não)
- Detalhes dos exames (opcional)
- Alergias (opcional)
- Senha segura

AUTORIZAÇÃO
Pergunte: "Posso criar esse paciente agora no sistema?"

CRIAÇÃO
Somente se o usuário confirmar, gere UM ÚNICO JSON com a primeira linha sendo: GERAR-PATIENTE-159753

ESTRUTURA DO JSON:

{
  "name": "string",
  "email": "string",
  "cpf": "string",
  "birthDate": "YYYY-MM-DD",
  "sexo": "string",
  "unidadeSaude": "string",
  "medicamentos": ["string", ...],
  "exames": boolean,
  "examesDetalhes": "string",
  "alergias": ["string", ...],
  "password": "string"
}`,
        minScore: 4,
        priority: 10,
        active: true,
        canStack: false,
        markers: ['GERAR-PATIENTE-159753'],
        agentId: defaultAgent.id,
        keywords: [
          { word: 'criar paciente', weight: 15 },
          { word: 'cadastrar paciente', weight: 15 },
          { word: 'novo paciente', weight: 12 },
          { word: 'adicionar paciente', weight: 12 },
          { word: 'registrar paciente', weight: 12 },
        ],
      });

      // Criar trigger de alteração de status de paciente
      await this.createTriggerWithKeywords({
        triggerId: 'patient-status-change',
        name: 'Alteração de Status de Paciente',
        description: 'Trigger para alterar o status de um paciente (ativar/desativar, dar alta)',
        systemPrompt: `Você é um especialista em gestão de pacientes do sistema de saúde pública.

Seu papel é conversar como uma pessoa real, com linguagem simples, clara e acolhedora.
Evite tom robótico, frases engessadas ou linguagem de sistema.

Você pode alterar o status de pacientes no sistema:
- **active**: ativar ou desativar o cadastro do paciente (true/false)
- **alta**: registrar alta médica do paciente (true/false). Quando alta=true, o sistema registra automaticamente a data da alta.

Siga obrigatoriamente a ordem abaixo, sem exceções:

IDENTIFICAÇÃO DO PACIENTE
Pergunte o CPF ou email do paciente para identificá-lo no sistema.

PRÉ-VISUALIZAÇÃO DA ALTERAÇÃO
Apresente em texto:
- Nome do paciente identificado
- CPF / Email
- Status atual (active, alta)
- Alterações que serão feitas

AUTORIZAÇÃO
Pergunte: "Posso aplicar essas alterações agora no sistema?"

ALTERAÇÃO
Somente se o usuário confirmar, gere UM ÚNICO JSON com a primeira linha sendo: ALTERAR-STATUS-PACIENTE-159753

ESTRUTURA DO JSON:
ALTERAR-STATUS-PACIENTE-159753
{
  "cpf": "string (CPF do paciente)" OU "email": "string (email do paciente)",
  "active": boolean (opcional),
  "alta": boolean (opcional)
}

REGRAS:
- Sempre identifique o paciente antes de alterar
- Inclua apenas os campos que devem ser alterados
- Quando alta=true, o sistema define altaAt automaticamente para a data atual
- Quando alta=false, o sistema limpa altaAt automaticamente
- Um paciente NÃO PODE estar de alta e ativo ao mesmo tempo. Quando alta=true, SEMPRE envie active=false no JSON.
- Se o usuário pedir para dar alta E ativar o paciente ao mesmo tempo, avise que não é possível: um paciente com alta não pode estar ativo.
- Não esqueça ALTERAR-STATUS-PACIENTE-159753 ele é essencial`,
        minScore: 4,
        priority: 8,
        active: true,
        canStack: false,
        markers: ['ALTERAR-STATUS-PACIENTE-159753'],
        agentId: defaultAgent.id,
        keywords: [
          { word: 'status paciente', weight: 15 },
          { word: 'ativar paciente', weight: 15 },
          { word: 'desativar paciente', weight: 15 },
          { word: 'dar alta', weight: 15 },
          { word: 'alta paciente', weight: 15 },
          { word: 'alta médica', weight: 12 },
          { word: 'inativar paciente', weight: 12 },
          { word: 'reativar paciente', weight: 12 },
          { word: 'mudar status', weight: 10 },
          { word: 'alterar status', weight: 10 },
        ],
      });

      // Criar trigger padrão (fallback)
      await this.createTriggerWithKeywords({
        triggerId: 'default',
        name: 'Conversa Geral',
        description: 'Trigger padrão para conversas que não ativam triggers específicas',
        systemPrompt: `Você é um assistente virtual do sistema de saúde pública municipal.

Seu papel é:
1. Ajudar os usuários com dúvidas gerais
2. Direcionar para as funcionalidades corretas do sistema
3. Ser educado, claro e objetivo

FUNCIONALIDADES DISPONÍVEIS:
- **Formulários**: Criação de formulários de triagem médica
- **Pacientes**: Cadastro e gerenciamento
- **Agendamentos**: Marcação de consultas
- **Notificações**: Envio de alertas
- **Dashboard**: Visão geral do sistema

Seja conversacional e amigável.`,
        minScore: 0,
        priority: 999,
        active: true,
        canStack: false,
        markers: [],
        agentId: defaultAgent.id,
        keywords: [],
      });

      this.triggerLogsBus.emit('[TriggerDbService] Agente e triggers padrão criados com sucesso!');
    }

    // Criar triggers faltantes (idempotente)
    await this.seedMissingTriggers();
  }

  /**
   * Cria triggers que ainda não existem no banco (por triggerId)
   */
  private async seedMissingTriggers() {
    const defaultAgent = await this.getDefaultAgent();
    if (!defaultAgent) return;

    const missingTriggers = this.getDefaultTriggerDefinitions(defaultAgent.id);

    for (const triggerDef of missingTriggers) {
      const exists = await this.prisma.aiTrigger.findUnique({
        where: { triggerId: triggerDef.triggerId },
      });

      if (!exists) {
        this.triggerLogsBus.emit(`[TriggerDbService] Criando trigger faltante: ${triggerDef.name}`);
        await this.createTriggerWithKeywords(triggerDef);
      }
    }
  }

  /**
   * Definições de todas as triggers padrão do sistema
   */
  private getDefaultTriggerDefinitions(agentId: string) {
    return [
      {
        triggerId: 'patient-status-change',
        name: 'Alteração de Status de Paciente',
        description: 'Trigger para alterar o status de um paciente (ativar/desativar, dar alta)',
        systemPrompt: `Você é um especialista em gestão de pacientes do sistema de saúde pública.

Seu papel é conversar como uma pessoa real, com linguagem simples, clara e acolhedora.
Evite tom robótico, frases engessadas ou linguagem de sistema.

Você pode alterar o status de pacientes no sistema:
- **active**: ativar ou desativar o cadastro do paciente (true/false)
- **alta**: registrar alta médica do paciente (true/false). Quando alta=true, o sistema registra automaticamente a data da alta.

Siga obrigatoriamente a ordem abaixo, sem exceções:

IDENTIFICAÇÃO DO PACIENTE
Pergunte o CPF ou email do paciente para identificá-lo no sistema.

PRÉ-VISUALIZAÇÃO DA ALTERAÇÃO
Apresente em texto:
- Nome do paciente identificado
- CPF / Email
- Status atual (active, alta)
- Alterações que serão feitas

AUTORIZAÇÃO
Pergunte: "Posso aplicar essas alterações agora no sistema?"

ALTERAÇÃO
Somente se o usuário confirmar, gere UM ÚNICO JSON com a primeira linha sendo: ALTERAR-STATUS-PACIENTE-159753

ESTRUTURA DO JSON:
{
  "cpf": "string (CPF do paciente)" OU "email": "string (email do paciente)",
  "active": boolean (opcional),
  "alta": boolean (opcional)
}

REGRAS:
- Sempre identifique o paciente antes de alterar
- Inclua apenas os campos que devem ser alterados
- Quando alta=true, o sistema define altaAt automaticamente para a data atual
- Quando alta=false, o sistema limpa altaAt automaticamente
- Um paciente NÃO PODE estar de alta e ativo ao mesmo tempo. Quando alta=true, SEMPRE envie active=false no JSON.
- Se o usuário pedir para dar alta E ativar o paciente ao mesmo tempo, avise que não é possível: um paciente com alta não pode estar ativo.`,
        minScore: 4,
        priority: 8,
        active: true,
        canStack: false,
        markers: ['ALTERAR-STATUS-PACIENTE-159753'],
        agentId,
        keywords: [
          { word: 'status paciente', weight: 15 },
          { word: 'ativar paciente', weight: 15 },
          { word: 'desativar paciente', weight: 15 },
          { word: 'dar alta', weight: 15 },
          { word: 'alta paciente', weight: 15 },
          { word: 'alta médica', weight: 12 },
          { word: 'inativar paciente', weight: 12 },
          { word: 'reativar paciente', weight: 12 },
          { word: 'mudar status', weight: 10 },
          { word: 'alterar status', weight: 10 },
        ],
      },
    ];
  }

  /**
   * Helper para criar trigger com keywords
   */
  private async createTriggerWithKeywords(data: {
    triggerId: string;
    name: string;
    description?: string;
    systemPrompt: string;
    minScore: number;
    priority: number;
    active: boolean;
    canStack: boolean;
    markers: string[];
    agentId: string;
    keywords: { word: string; weight: number }[];
  }) {
    return this.prisma.aiTrigger.create({
      data: {
        triggerId: data.triggerId,
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        minScore: data.minScore,
        priority: data.priority,
        active: data.active,
        canStack: data.canStack,
        markers: data.markers,
        agentId: data.agentId,
        keywords: {
          create: data.keywords.map(k => ({
            word: k.word,
            weight: k.weight,
          })),
        },
      },
      include: {
        keywords: true,
      },
    });
  }

  // ============================================
  // AGENTS CRUD
  // ============================================

  async listAgents() {
    return this.prisma.aiAgent.findMany({
      include: {
        triggers: {
          include: {
            keywords: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAgent(id: string) {
    const agent = await this.prisma.aiAgent.findUnique({
      where: { id },
      include: {
        triggers: {
          include: {
            keywords: true,
          },
          orderBy: { priority: 'asc' },
        },
      },
    });
    if (!agent) throw new NotFoundException(`Agente ${id} não encontrado`);
    return agent;
  }

  async getDefaultAgent() {
    return this.prisma.aiAgent.findFirst({
      where: { isDefault: true, active: true },
      include: {
        triggers: {
          where: { active: true },
          include: {
            keywords: true,
          },
          orderBy: { priority: 'asc' },
        },
      },
    });
  }

  async createAgent(dto: CreateAgentDto) {
    // Se for default, remover flag de outros
    if (dto.isDefault) {
      await this.prisma.aiAgent.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const agent = await this.prisma.aiAgent.create({
      data: {
        name: dto.name,
        description: dto.description,
        model: dto.model || 'gpt-4o-mini',
        temperature: dto.temperature || 0.7,
        maxTokens: dto.maxTokens || 2048,
        systemPrompt: dto.systemPrompt,
        active: dto.active ?? true,
        isDefault: dto.isDefault ?? false,
      },
    });

    this.triggerLogsBus.emit(`[TriggerDbService] Agente "${agent.name}" criado com ID: ${agent.id}`);
    return agent;
  }

  async updateAgent(id: string, dto: UpdateAgentDto) {
    const agent = await this.getAgent(id);

    // Se for tornar default, remover flag de outros
    if (dto.isDefault) {
      await this.prisma.aiAgent.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.aiAgent.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        model: dto.model,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        systemPrompt: dto.systemPrompt,
        active: dto.active,
        isDefault: dto.isDefault,
      },
      include: {
        triggers: {
          include: {
            keywords: true,
          },
        },
      },
    });

    this.triggerLogsBus.emit(`[TriggerDbService] Agente "${updated.name}" atualizado`);
    return updated;
  }

  async deleteAgent(id: string) {
    const agent = await this.getAgent(id);

    if (agent.isDefault) {
      throw new Error('Não é possível excluir o agente padrão');
    }

    await this.prisma.aiAgent.delete({ where: { id } });
    this.triggerLogsBus.emit(`[TriggerDbService] Agente "${agent.name}" excluído`);
    return { success: true };
  }

  // ============================================
  // TRIGGERS CRUD
  // ============================================

  async listTriggers(agentId?: string) {
    return this.prisma.aiTrigger.findMany({
      where: agentId ? { agentId } : undefined,
      include: {
        keywords: true,
        agent: {
          select: { id: true, name: true },
        },
      },
      orderBy: { priority: 'asc' },
    });
  }

  async getActiveTriggers(agentId?: string) {
    // Se não passou agentId, usa o agente padrão
    let targetAgentId = agentId;
    if (!targetAgentId) {
      const defaultAgent = await this.getDefaultAgent();
      targetAgentId = defaultAgent?.id;
    }

    if (!targetAgentId) return [];

    return this.prisma.aiTrigger.findMany({
      where: {
        agentId: targetAgentId,
        active: true,
      },
      include: {
        keywords: true,
      },
      orderBy: { priority: 'asc' },
    });
  }

  async getTrigger(id: string) {
    const trigger = await this.prisma.aiTrigger.findUnique({
      where: { id },
      include: {
        keywords: true,
        agent: true,
      },
    });
    if (!trigger) throw new NotFoundException(`Trigger ${id} não encontrada`);
    return trigger;
  }

  async getTriggerByTriggerId(triggerId: string) {
    const trigger = await this.prisma.aiTrigger.findUnique({
      where: { triggerId },
      include: {
        keywords: true,
        agent: true,
      },
    });
    return trigger;
  }

  async createTrigger(dto: CreateTriggerDto) {
    // Verificar se o agente existe
    await this.getAgent(dto.agentId);

    const trigger = await this.prisma.aiTrigger.create({
      data: {
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        minScore: dto.minScore || 5,
        priority: dto.priority || 10,
        active: dto.active ?? true,
        canStack: dto.canStack ?? false,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        markers: dto.markers || [],
        agentId: dto.agentId,
        keywords: dto.keywords ? {
          create: dto.keywords.map(k => ({
            word: k.word,
            weight: k.weight,
          })),
        } : undefined,
      },
      include: {
        keywords: true,
      },
    });

    this.triggerLogsBus.emit(`[TriggerDbService] Trigger "${trigger.name}" criada com ID: ${trigger.id}`);
    return trigger;
  }

  async updateTrigger(id: string, dto: UpdateTriggerDto) {
    const trigger = await this.getTrigger(id);

    // Se atualizou keywords, deletar antigas e criar novas
    if (dto.keywords) {
      await this.prisma.aiTriggerKeyword.deleteMany({
        where: { triggerId: id },
      });
    }

    const updated = await this.prisma.aiTrigger.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        minScore: dto.minScore,
        priority: dto.priority,
        active: dto.active,
        canStack: dto.canStack,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        markers: dto.markers,
        keywords: dto.keywords ? {
          create: dto.keywords.map(k => ({
            word: k.word,
            weight: k.weight,
          })),
        } : undefined,
      },
      include: {
        keywords: true,
      },
    });

    this.triggerLogsBus.emit(`[TriggerDbService] Trigger "${updated.name}" atualizada`);
    return updated;
  }

  async toggleTrigger(id: string) {
    const trigger = await this.getTrigger(id);

    const updated = await this.prisma.aiTrigger.update({
      where: { id },
      data: { active: !trigger.active },
    });

    this.triggerLogsBus.emit(`[TriggerDbService] Trigger "${updated.name}" ${updated.active ? 'ativada' : 'desativada'}`);
    return updated;
  }

  async deleteTrigger(id: string) {
    const trigger = await this.getTrigger(id);

    await this.prisma.aiTrigger.delete({ where: { id } });
    this.triggerLogsBus.emit(`[TriggerDbService] Trigger "${trigger.name}" excluída`);
    return { success: true };
  }

  // ============================================
  // DETECTION LOGIC
  // ============================================

  /**
   * Detecta qual trigger deve ser ativada com base na mensagem
   */
  async detectTrigger(message: string, conversationHistory?: any[], agentId?: string) {
    const triggers = await this.getActiveTriggers(agentId);

    if (triggers.length === 0) {
      this.triggerLogsBus.emit('[TriggerDbService] Nenhuma trigger ativa encontrada');
      return { trigger: null, score: 0 };
    }

    const lowerMessage = message.toLowerCase();
    let bestTrigger: any = null;
    let bestScore = 0;
    const stackedTriggers: any[] = [];

    this.triggerLogsBus.emit(`[TriggerDbService] Detectando trigger para: "${message.substring(0, 50)}..."`);

    for (const trigger of triggers) {
      // Pular trigger default na busca inicial
      if (trigger.triggerId === 'default') continue;

      let score = 0;

      // Calcular score baseado nas keywords
      for (const keyword of trigger.keywords) {
        if (this.matchKeyword(lowerMessage, keyword.word.toLowerCase())) {
          score += keyword.weight;
        }
      }

      // Verificar histórico (últimas 6 mensagens)
      if (conversationHistory && conversationHistory.length > 0) {
        const lastMessages = conversationHistory.slice(-6);
        for (const msg of lastMessages) {
          const content = msg.content?.toLowerCase() || '';
          for (const keyword of trigger.keywords) {
            if (this.matchKeyword(content, keyword.word.toLowerCase())) {
              score += keyword.weight / 2;
            }
          }
        }
      }

      this.triggerLogsBus.emit(`[TriggerDbService] ${trigger.name}: score=${score}, minScore=${trigger.minScore}`);

      if (score >= trigger.minScore) {
        if (trigger.canStack) {
          stackedTriggers.push(trigger);
        }
        if (score > bestScore) {
          bestScore = score;
          bestTrigger = trigger;
        }
      }
    }

    // Se não encontrou trigger e a mensagem parece confirmação,
    // verificar histórico com peso total para manter contexto
    if (!bestTrigger && this.isConfirmationMessage(lowerMessage) && conversationHistory) {
      const userMessages = conversationHistory
        .filter(m => m.role === 'USER')
        .slice(-4);

      for (const trigger of triggers) {
        if (trigger.triggerId === 'default') continue;
        let historyScore = 0;

        for (const msg of userMessages) {
          const content = msg.content?.toLowerCase() || '';
          for (const keyword of trigger.keywords) {
            if (this.matchKeyword(content, keyword.word.toLowerCase())) {
              historyScore += keyword.weight;
            }
          }
        }

        if (historyScore >= trigger.minScore && historyScore > bestScore) {
          bestScore = historyScore;
          bestTrigger = trigger;
        }
      }

      if (bestTrigger) {
        this.triggerLogsBus.emit(`[TriggerDbService] Confirmação detectada, mantendo trigger: ${bestTrigger.name} (score: ${bestScore})`);
      }
    }

    // Se não encontrou, usar default
    if (!bestTrigger) {
      bestTrigger = triggers.find(t => t.triggerId === 'default') || null;
      bestScore = bestTrigger ? 1 : 0;
      this.triggerLogsBus.emit('[TriggerDbService] Usando trigger default');
    } else {
      this.triggerLogsBus.emit(`[TriggerDbService] Trigger selecionada: ${bestTrigger.name} (score: ${bestScore})`);
    }

    return {
      trigger: bestTrigger,
      score: bestScore,
      stackedTriggers: stackedTriggers.length > 0 ? stackedTriggers : undefined,
    };
  }

  /**
   * Verifica se todas as palavras da keyword aparecem no texto
   * Para keywords compostas como "ativar paciente", match "ativar o paciente"
   */
  private matchKeyword(text: string, keyword: string): boolean {
    if (!keyword.includes(' ')) return text.includes(keyword);
    const words = keyword.split(' ');
    return words.every(word => text.includes(word));
  }

  /**
   * Verifica se a mensagem é uma confirmação curta
   */
  private isConfirmationMessage(message: string): boolean {
    const confirmations = [
      'sim', 'ok', 'pode', 'confirmo', 'confirmar', 'claro',
      'com certeza', 'pode sim', 'sim pode', 'vai', 'manda',
      'faz', 'faz isso', 'pode fazer', 'aplica', 'aplique',
      'positivo', 'afirmativo', 'certo', 'beleza', 'bora',
    ];
    return message.length < 50 && confirmations.some(p => message.trim() === p || message.includes(p));
  }

  /**
   * Obtém configuração do prompt para uma trigger
   */
  async getPromptConfig(triggerId: string, agentId?: string) {
    const trigger = await this.getTriggerByTriggerId(triggerId);
    if (!trigger) return null;

    const agent = await this.getAgent(trigger.agentId);

    return {
      systemPrompt: trigger.systemPrompt,
      temperature: trigger.temperature ?? agent.temperature,
      maxTokens: trigger.maxTokens ?? agent.maxTokens,
      model: agent.model,
      markers: trigger.markers,
    };
  }

  /**
   * Estatísticas
   */
  async getStats(agentId?: string) {
    const where = agentId ? { agentId } : {};

    const [total, active, inactive] = await Promise.all([
      this.prisma.aiTrigger.count({ where }),
      this.prisma.aiTrigger.count({ where: { ...where, active: true } }),
      this.prisma.aiTrigger.count({ where: { ...where, active: false } }),
    ]);

    const triggers = await this.prisma.aiTrigger.findMany({
      where,
      select: {
        id: true,
        triggerId: true,
        name: true,
        active: true,
        priority: true,
      },
      orderBy: { priority: 'asc' },
    });

    return { total, active, inactive, triggers };
  }
}
