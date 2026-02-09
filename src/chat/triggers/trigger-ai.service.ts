import { Injectable, BadRequestException } from '@nestjs/common';

export interface GeneratedKeyword {
    word: string;
    weight: number;
}

@Injectable()
export class TriggerAIService {
    private openaiApiKey: string;
    private openaiBaseUrl = 'https://api.openai.com/v1/chat/completions';

    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY || '';
        if (!this.openaiApiKey) {
            console.warn('[TriggerAIService] OPENAI_API_KEY não configurada');
        }
    }

    async generateKeywords(data: {
        name: string;
        description?: string;
        systemPrompt?: string;
    }): Promise<GeneratedKeyword[]> {
        if (!this.openaiApiKey) {
            throw new BadRequestException('OPENAI_API_KEY não configurada');
        }

        const context = [
            `Nome da trigger: ${data.name}`,
            data.description ? `Descrição: ${data.description}` : '',
            data.systemPrompt ? `System Prompt: ${data.systemPrompt.substring(0, 500)}...` : '',
        ].filter(Boolean).join('\n');

        const prompt = `Você é um especialista em criar palavras-chave para um sistema de detecção de triggers de chat.

Baseado nas informações da trigger abaixo, gere uma lista de 10-15 palavras-chave/frases relevantes que usuários podem digitar para ativar essa trigger.

${context}

REGRAS:
1. As palavras devem ser em português brasileiro
2. Inclua variações (singular/plural, sinônimos, erros de digitação comuns)
3. Atribua pesos de 1-10 (1=pouco relevante, 10=muito relevante)
4. Palavras mais específicas e únicas devem ter peso maior
5. Palavras genéricas devem ter peso menor
6. Inclua frases curtas relevantes (2-3 palavras)

Retorne APENAS um JSON válido no formato:
{"keywords": [{"word": "exemplo", "weight": 5}]}

Não inclua explicações, apenas o JSON.`;

        try {
            const response = await fetch(this.openaiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.openaiApiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new BadRequestException(
                    `Erro ao gerar keywords: ${error.error?.message || 'Erro desconhecido'}`,
                );
            }

            const responseData = await response.json();
            const content = responseData.choices[0]?.message?.content || '';

            // Extrair JSON da resposta
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new BadRequestException('Resposta da IA não contém JSON válido');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
                throw new BadRequestException('Formato de resposta inválido');
            }

            // Validar e limpar keywords
            return parsed.keywords
                .filter((k: any) => k.word && typeof k.word === 'string')
                .map((k: any) => ({
                    word: k.word.trim().toLowerCase(),
                    weight: Math.min(10, Math.max(1, Number(k.weight) || 5)),
                }));
        } catch (error) {
            console.error('[TriggerAIService] Erro ao gerar keywords:', error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException('Erro ao processar geração de keywords');
        }
    }
}
