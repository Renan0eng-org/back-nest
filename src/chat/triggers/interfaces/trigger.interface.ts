/**
 * Interface base para todas as triggers do sistema de chat
 * 
 * Cada trigger é responsável por:
 * - Detectar se uma mensagem corresponde ao seu domínio
 * - Fornecer o prompt de sistema específico para sua especialidade
 * - Processar respostas especiais (como criação de formulários)
 */

export interface TriggerKeyword {
  word: string;
  weight: number; // Peso da palavra-chave (1-10)
}

export interface TriggerConfig {
  /** Identificador único da trigger */
  id: string;

  /** Nome legível da trigger */
  name: string;

  /** Descrição do que a trigger faz */
  description: string;

  /** Palavras-chave que ativam esta trigger */
  keywords: TriggerKeyword[];

  /** Pontuação mínima para ativar (soma dos pesos das keywords encontradas) */
  minScore: number;

  /** Se verdadeiro, a trigger será verificada mesmo se outra já foi ativada */
  canStack?: boolean;

  /** Ordem de prioridade (menor = maior prioridade) */
  priority: number;

  /** Se a trigger está ativa */
  active: boolean;
}

export interface TriggerPrompt {
  /** Prompt de sistema para esta especialidade */
  systemPrompt: string;

  /** Instruções adicionais opcionais */
  additionalInstructions?: string;

  /** Temperatura recomendada para o modelo */
  temperature?: number;

  /** Máximo de tokens recomendado */
  maxTokens?: number;
}

export interface TriggerProcessResult {
  /** Se a resposta foi processada com sucesso */
  success: boolean;

  /** Dados resultantes do processamento (ex: formulário criado) */
  data?: any;

  /** Texto de resposta modificado */
  responseText?: string;

  /** Erro, se houver */
  error?: string;
}

export interface ITrigger {
  /** Configuração da trigger */
  config: TriggerConfig;

  /** Prompt associado a esta trigger */
  prompt: TriggerPrompt;

  /**
   * Verifica se a mensagem ativa esta trigger
   * @param message Mensagem do usuário
   * @param conversationHistory Histórico da conversa para contexto
   * @returns Score calculado (0 = não ativou, > minScore = ativou)
   */
  checkActivation(message: string, conversationHistory?: any[]): number;

  /**
   * Processa a resposta do modelo (opcional)
   * Útil para triggers que precisam executar ações após a resposta
   * @param response Resposta do modelo
   * @param context Contexto adicional
   */
  processResponse?(response: string, context?: any): Promise<TriggerProcessResult>;

  /**
   * Marcadores especiais que esta trigger pode usar nas respostas
   */
  getMarkers?(): string[];
}

/**
 * Tipo para registro de triggers
 */
export type TriggerRegistry = Map<string, ITrigger>;

/**
 * Resultado da detecção de trigger
 */
export interface TriggerDetectionResult {
  /** Trigger detectada */
  trigger: ITrigger | null;

  /** Score da detecção */
  score: number;

  /** Todas as triggers que foram ativadas (se canStack = true) */
  stackedTriggers?: ITrigger[];
}

/**
 * Configuração do prompt final a ser enviado ao modelo
 */
export interface FinalPromptConfig {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  triggers: ITrigger[];
}
