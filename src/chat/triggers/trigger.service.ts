import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  FinalPromptConfig,
  ITrigger,
  TriggerDetectionResult,
  TriggerProcessResult,
  TriggerRegistry,
} from './interfaces/trigger.interface';
import { TriggerLogsBus } from './trigger-logs.bus';
import { DefaultTrigger } from './triggers/default.trigger';
import { DocumentationTrigger } from './triggers/documentation.trigger';
import { FormTrigger } from './triggers/form.trigger';

/**
 * Helper para emitir log tanto no console quanto no subject para streaming
 */

/**
 * Serviço principal de gerenciamento de triggers
 * 
 * Responsável por:
 * - Registrar e gerenciar todas as triggers disponíveis
 * - Detectar qual trigger deve ser ativada com base na mensagem
 * - Retornar a configuração de prompt apropriada
 * - Processar respostas através das triggers ativas
 */
@Injectable()
export class TriggerService implements OnModuleInit {
  private triggers: TriggerRegistry = new Map();
  private defaultTrigger: ITrigger;

  constructor(
    private formTrigger: FormTrigger,
    private documentationTrigger: DocumentationTrigger,
    private defaultTriggerInstance: DefaultTrigger,
    private triggerLogsBus: TriggerLogsBus
  ) {
    this.defaultTrigger = defaultTriggerInstance;
  }

  onModuleInit() {
    // Registrar todas as triggers
    this.registerTrigger(this.formTrigger);
    this.registerTrigger(this.documentationTrigger);
    this.registerTrigger(this.defaultTriggerInstance);

    this.triggerLogsBus.emit(`[TriggerService] ${this.triggers.size} triggers registradas`);
    this.triggers.forEach((trigger, id) => {
      this.triggerLogsBus.emit(`  - ${id}: ${trigger.config.name} (prioridade: ${trigger.config.priority})`);
    });
  }

  /**
   * Registra uma nova trigger no sistema
   */
  registerTrigger(trigger: ITrigger): void {
    if (this.triggers.has(trigger.config.id)) {
      this.triggerLogsBus.emit(`[TriggerService] Trigger ${trigger.config.id} já registrada, substituindo...`);
    }
    this.triggers.set(trigger.config.id, trigger);
  }

  /**
   * Remove uma trigger do sistema
   */
  unregisterTrigger(triggerId: string): boolean {
    return this.triggers.delete(triggerId);
  }

  /**
   * Obtém uma trigger pelo ID
   */
  getTrigger(triggerId: string): ITrigger | undefined {
    return this.triggers.get(triggerId);
  }

  /**
   * Lista todas as triggers registradas
   */
  listTriggers(): ITrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Lista apenas triggers ativas
   */
  listActiveTriggers(): ITrigger[] {
    return this.listTriggers().filter((t) => t.config.active);
  }

  /**
   * Detecta qual trigger deve ser ativada com base na mensagem e contexto
   */
  detectTrigger(
    message: string,
    conversationHistory?: any[],
  ): TriggerDetectionResult {
    const activeTriggers = this.listActiveTriggers()
      .filter((t) => t.config.id !== 'default') // Excluir default da busca inicial
      .sort((a, b) => a.config.priority - b.config.priority);

    let bestTrigger: ITrigger | null = null;
    let bestScore = 0;
    const stackedTriggers: ITrigger[] = [];
    const scores: { trigger: string; score: number; minScore: number }[] = [];

    // Log do contexto sendo usado
    this.triggerLogsBus.emit(`[TriggerService] Detectando trigger para mensagem: "${message.substring(0, 50)}..."`);
    if (conversationHistory && conversationHistory.length > 0) {
      this.triggerLogsBus.emit(`[TriggerService] Histórico: ${conversationHistory.length} mensagens`);
    } else {
      this.triggerLogsBus.emit(`[TriggerService] Sem histórico de conversa`);
    }

    for (const trigger of activeTriggers) {
      const score = trigger.checkActivation(message, conversationHistory);
      scores.push({ trigger: trigger.config.name, score, minScore: trigger.config.minScore });

      this.triggerLogsBus.emit(`[TriggerService] ${trigger.config.name}: score=${score}, minScore=${trigger.config.minScore}, atingiu=${score >= trigger.config.minScore}`);

      // Verificar se atingiu o score mínimo
      if (score >= trigger.config.minScore) {
        // Se pode stackar, adiciona à lista
        if (trigger.config.canStack) {
          stackedTriggers.push(trigger);
        }

        // Verifica se é a melhor trigger até agora
        if (score > bestScore) {
          bestScore = score;
          bestTrigger = trigger;
        }
      }
    }

    // Se não encontrou nenhuma trigger, usa a default
    if (!bestTrigger) {
      this.triggerLogsBus.emit(`[TriggerService] Nenhuma trigger específica ativada, usando DefaultTrigger`);
      bestTrigger = this.defaultTrigger;
      bestScore = 1;
    } else {
      this.triggerLogsBus.emit(`[TriggerService] Trigger selecionada: ${bestTrigger.config.name} (score: ${bestScore})`);
      if (stackedTriggers.length > 0) {
        this.triggerLogsBus.emit(`[TriggerService] Triggers empilhadas: ${stackedTriggers.map(t => t.config.name).join(', ')}`);
      }
    }

    return {
      trigger: bestTrigger,
      score: bestScore,
      stackedTriggers: stackedTriggers.length > 0 ? stackedTriggers : undefined,
    };
  }

  /**
   * Obtém a configuração final do prompt baseada na detecção
   */
  getPromptConfig(
    message: string,
    conversationHistory?: any[],
  ): FinalPromptConfig {
    const detection = this.detectTrigger(message, conversationHistory);
    const trigger = detection.trigger!;

    // Tratamento especial para DocumentationTrigger
    let prompt = trigger.prompt;
    if (trigger instanceof DocumentationTrigger) {
      prompt = (trigger as DocumentationTrigger).getPromptWithDocumentation(message, conversationHistory);
    }

    return {
      systemPrompt: prompt.systemPrompt,
      temperature: prompt.temperature || 0.7,
      maxTokens: prompt.maxTokens || 2048,
      triggers: [trigger, ...(detection.stackedTriggers || [])],
    };
  }

  /**
   * Processa a resposta do modelo através das triggers ativas
   */
  async processResponse(
    response: string,
    triggers: ITrigger[],
    context?: any,
  ): Promise<TriggerProcessResult> {
    let currentResponse = response;
    let finalData: any = null;

    for (const trigger of triggers) {
      if (trigger.processResponse) {
        const result = await trigger.processResponse(currentResponse, context);
        
        if (result.responseText) {
          currentResponse = result.responseText;
        }
        
        if (result.data) {
          finalData = result.data;
        }

        // Se houver erro, parar o processamento
        if (!result.success && result.error) {
          return {
            success: false,
            error: result.error,
            responseText: currentResponse,
            data: finalData,
          };
        }
      }
    }

    return {
      success: true,
      responseText: currentResponse,
      data: finalData,
    };
  }

  /**
   * Ativa ou desativa uma trigger
   */
  setTriggerActive(triggerId: string, active: boolean): boolean {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.config.active = active;
      return true;
    }
    return false;
  }

  /**
   * Obtém estatísticas das triggers
   */
  getStats(): TriggerStats {
    const triggers = this.listTriggers();
    return {
      total: triggers.length,
      active: triggers.filter((t) => t.config.active).length,
      inactive: triggers.filter((t) => !t.config.active).length,
      triggers: triggers.map((t) => ({
        id: t.config.id,
        name: t.config.name,
        active: t.config.active,
        priority: t.config.priority,
      })),
    };
  }
}

export interface TriggerStats {
  total: number;
  active: number;
  inactive: number;
  triggers: {
    id: string;
    name: string;
    active: boolean;
    priority: number;
  }[];
}
