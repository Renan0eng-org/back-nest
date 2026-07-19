import { BadRequestException, Injectable } from '@nestjs/common';

export type ImproveScope = 'whole' | 'selection';
export type ImproveFormat = 'html' | 'text';

/**
 * Melhoria de notas clínicas por IA (OpenAI gpt-4o), gated pelo menu
 * `atendimento-ia`. Reescreve/organiza o texto SEM inventar dados clínicos.
 */
@Injectable()
export class AttendanceAiService {
  private openaiApiKey = process.env.OPENAI_API_KEY || '';
  private openaiBaseUrl = 'https://api.openai.com/v1/chat/completions';

  async improve(params: {
    text: string;
    scope?: ImproveScope;
    format?: ImproveFormat;
    noteTitle?: string;
  }): Promise<string> {
    if (!this.openaiApiKey) {
      throw new BadRequestException('OPENAI_API_KEY não configurada');
    }
    const text = (params.text || '').trim();
    if (!text) throw new BadRequestException('Texto vazio para melhorar.');

    const scope = params.scope ?? 'whole';
    const format = params.format ?? 'text';

    const formatRule =
      format === 'html'
        ? 'O texto de entrada está em HTML. Retorne HTML válido e simples (use <p>, <ul>, <li>, <strong>, <em>), sem <html>/<body>, sem blocos de código e sem markdown.'
        : 'Retorne texto puro, sem HTML e sem markdown.';

    const scopeRule =
      scope === 'selection'
        ? 'Você recebeu apenas um TRECHO da nota. Melhore somente esse trecho e retorne apenas o trecho reescrito, sem adicionar seções novas.'
        : 'Você recebeu a nota completa. Reorganize e melhore mantendo todas as informações.';

    const prompt = `Você é um assistente que melhora notas clínicas de um sistema de saúde, em português brasileiro.

Objetivo: reescrever o texto para ficar mais claro, correto (gramática e ortografia) e bem estruturado, mantendo o tom técnico-clínico.

REGRAS OBRIGATÓRIAS:
1. NÃO invente sintomas, diagnósticos, medicamentos, doses ou dados que não estejam no texto original.
2. NÃO remova nenhuma informação clínica presente.
3. Não adicione opiniões, conclusões ou condutas que não existam no original.
4. Mantenha abreviações médicas usuais quando fizerem sentido.
5. ${scopeRule}
6. ${formatRule}
7. Retorne APENAS o texto melhorado, sem comentários, sem aspas e sem prefixos.
${params.noteTitle ? `\nTítulo da nota: ${params.noteTitle}` : ''}

TEXTO ORIGINAL:
"""
${text}
"""`;

    try {
      const response = await fetch(this.openaiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new BadRequestException(
          `Erro ao melhorar a nota: ${error?.error?.message || 'Erro desconhecido'}`,
        );
      }

      const data = await response.json();
      const content: string = data.choices?.[0]?.message?.content ?? '';
      const cleaned = content
        .replace(/^```[a-z]*\n?/i, '')
        .replace(/```$/i, '')
        .trim();
      if (!cleaned) throw new BadRequestException('A IA não retornou conteúdo.');
      return cleaned;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('[AttendanceAiService] Erro ao melhorar nota:', error);
      throw new BadRequestException('Erro ao processar a melhoria da nota.');
    }
  }
}
