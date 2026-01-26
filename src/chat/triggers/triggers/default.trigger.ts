import { Injectable } from '@nestjs/common';
import {
  ITrigger,
  TriggerConfig,
  TriggerProcessResult,
  TriggerPrompt,
} from '../interfaces/trigger.interface';

/**
 * Trigger padrão (fallback) quando nenhuma outra trigger é ativada
 * 
 * Esta trigger é usada para conversas gerais que não se encaixam
 * em nenhuma especialidade específica.
 */
@Injectable()
export class DefaultTrigger implements ITrigger {
  config: TriggerConfig = {
    id: 'default',
    name: 'Conversa Geral',
    description: 'Trigger padrão para conversas que não ativam triggers específicas',
    keywords: [], // Não usa keywords, é o fallback
    minScore: 0, // Sempre pode ser usado como fallback
    priority: 999, // Menor prioridade
    active: true,
    canStack: false,
  };

  prompt: TriggerPrompt = {
    systemPrompt: `Você é um assistente virtual do sistema de saúde pública municipal.

Seu papel é:
1. Ajudar os usuários com dúvidas gerais
2. Direcionar para as funcionalidades corretas do sistema
3. Ser educado, claro e objetivo

FUNCIONALIDADES DISPONÍVEIS NO SISTEMA:
- **Formulários**: Criação de formulários de triagem médica (diga "criar formulário" para começar)
- **Pacientes**: Cadastro e gerenciamento de pacientes
- **Agendamentos**: Marcação de consultas e atendimentos
- **Notificações**: Envio de alertas e comunicados
- **Dashboard**: Visão geral do sistema

Se o usuário quiser:
- Criar um formulário: Pergunte que tipo de formulário ele precisa
- Ajuda sobre o sistema: Pergunte sobre qual funcionalidade
- Outra coisa: Tente ajudar ou direcione para a funcionalidade correta

Seja conversacional e amigável, como se estivesse conversando com um colega.`,
    temperature: 0.7,
    maxTokens: 1024,
  };

  checkActivation(message: string, conversationHistory?: any[]): number {
    // Sempre retorna score mínimo - é o fallback
    return 1;
  }

  async processResponse(
    response: string,
    context?: any,
  ): Promise<TriggerProcessResult> {
    // Não precisa de processamento especial
    return { success: true, responseText: response };
  }
}
