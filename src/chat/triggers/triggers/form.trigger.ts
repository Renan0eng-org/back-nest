import { Injectable } from '@nestjs/common';
import { FormService } from 'src/forms/form.service';
import {
    ITrigger,
    TriggerConfig,
    TriggerProcessResult,
    TriggerPrompt,
} from '../interfaces/trigger.interface';

@Injectable()
export class FormTrigger implements ITrigger {
    private readonly FORM_MARKER = 'GERAR-FORM-159753';

    config: TriggerConfig = {
        id: 'form-creation',
        name: 'Criação de Formulários',
        description: 'Trigger para criação de formulários médicos e de triagem',
        keywords: [
            { word: 'formulário', weight: 10 },
            { word: 'formulario', weight: 10 },
            { word: 'form', weight: 8 },
            { word: 'criar formulário', weight: 15 },
            { word: 'criar formulario', weight: 15 },
            { word: 'gerar formulário', weight: 15 },
            { word: 'gerar formulario', weight: 15 },
            { word: 'novo formulário', weight: 12 },
            { word: 'novo formulario', weight: 12 },
            { word: 'triagem', weight: 8 },
            { word: 'questionário', weight: 8 },
            { word: 'questionario', weight: 8 },
            { word: 'perguntas', weight: 5 },
            { word: 'anamnese', weight: 10 },
            { word: 'avaliação', weight: 5 },
            { word: 'ficha', weight: 5 },
            { word: 'cadastro médico', weight: 8 },
            { word: 'saúde', weight: 3 },
            { word: 'paciente', weight: 4 },
            { word: 'sintomas', weight: 5 },
            { word: 'diagnóstico', weight: 5 },
        ],
        minScore: 5,
        priority: 1,
        active: true,
        canStack: false,
    };

    prompt: TriggerPrompt = {
        systemPrompt: `Você é um especialista em criação de formulários médicos para sistemas públicos de saúde.

Seu papel é conversar como uma pessoa real, com linguagem simples, clara e acolhedora.
Evite tom robótico, frases engessadas ou linguagem de sistema.

Se a finalidade do formulário já estiver clara, você pode criá-lo sem pedir mais detalhes.

Siga obrigatoriamente a ordem abaixo, sem exceções:

INTERPRETAÇÃO AUTOMÁTICA
Título da sessão: Interpretação Automática da Intenção do Usuário

Analise a mensagem do usuário e descreva, de forma natural e direta:

Qual é o objetivo do formulário

Em que contexto de saúde ele será usado

Quem provavelmente vai responder

Se faz sentido usar como formulário de triagem

Se o uso de pontuação ajuda na avaliação

Se algo não for informado, assuma valores coerentes com a realidade de sistemas públicos de saúde, explicando de forma simples.

FORMULÁRIO EM TEXTO (PRÉ-VISUALIZAÇÃO)

Apresente o formulário completo em texto, como se estivesse explicando para um usuário comum (não técnico).

Inclua:

Título claro e amigável

Uma descrição curta explicando para que serve o formulário

Perguntas objetivas e fáceis de entender

Tipo de resposta descrito em linguagem comum (ex: "escolha uma opção")

Opções de resposta com pontuação visível

Explicação simples de como a pontuação será usada para avaliar o caso

Não use termos técnicos com o usuário final.

AUTORIZAÇÃO

Pergunte exatamente:

"Posso criar esse formulário agora no sistema?"

Explique, em uma frase simples, que o formulário só será criado se houver uma confirmação clara.

CRIAÇÃO

Somente se o usuário confirmar explicitamente:

Gere UM ÚNICO JSON

Totalmente compatível com POST /forms

Gere tudo automaticamente

Não explique o JSON

Não adicione texto antes ou depois

Retorne apenas o JSON puro

A primeira linha deve ser exatamente:
${this.FORM_MARKER}

REGRAS RÍGIDAS

Nunca gere JSON sem autorização

Nunca crie campos fora da estrutura da API

Nunca gere mais de um JSON

Nunca use linguagem técnica com o usuário final

Nunca reutilize exemplos fixos

ESTRUTURA OBRIGATÓRIA DO JSON

{
"title": string,
"description": string,
"questions": [
{
"text": string,
"type": "MULTIPLE_CHOICE" | "CHECKBOXES",
"required": boolean,
"options": [
{
"text": string,
"value": number
}
]
}
],
"scoreRules": [
{
"minScore": number,
"maxScore": number,
"classification": string,
"conduct": string,
"order": number
}
]
}

REGRAS DE GERAÇÃO

Título e descrição devem refletir claramente o contexto do formulário

Perguntas devem estar diretamente ligadas ao objetivo da triagem

Tipos de pergunta devem ser escolhidos corretamente

Todas as opções devem ter pontuação

As regras de pontuação devem cobrir toda a faixa possível de pontos

Os valores devem ser originais e coerentes

Se qualquer regra acima não for cumprida, a resposta é inválida`,
        temperature: 0.7,
        maxTokens: 2048,
    };

    constructor(private formService: FormService) { }

    checkActivation(message: string, conversationHistory?: any[]): number {
        const lowerMessage = message.toLowerCase();
        let score = 0;

        // Verificar palavras-chave na mensagem atual
        for (const keyword of this.config.keywords) {
            if (lowerMessage.includes(keyword.word.toLowerCase())) {
                score += keyword.weight;
            }
        }

        // Verificar contexto do histórico (se já estava falando sobre formulários)
        if (conversationHistory && conversationHistory.length > 0) {
            const lastMessages = conversationHistory.slice(-4); // Últimas 4 mensagens
            for (const keyword of this.config.keywords) {
                for (const msg of lastMessages) {
                    const content = msg.content?.toLowerCase() || '';
                    // Se já estava no contexto de formulário, adicionar peso
                    // if (
                    //     content.includes('formulário') ||
                    //     content.includes('formulario') ||
                    //     content.includes(this.FORM_MARKER.toLowerCase())
                    // ) {
                    //     score += 5; // Bonus por contexto
                    //     break;
                    // }
                    // if (lowerMessage.includes(keyword.word.toLowerCase())) {
                    if (content.includes(keyword.word.toLowerCase())) {
                        score += keyword.weight / 2; // Metade do peso por contexto
                    }
                }
            }
        }

        return score;
    }

    async processResponse(
        response: string,
        context?: any,
    ): Promise<TriggerProcessResult> {
        try {
            console.log('[FormTrigger] Processando resposta...');
            console.log('[FormTrigger] Resposta contém FORM_MARKER?', response.includes(this.FORM_MARKER));

            // Verificar se a resposta contém o marcador de criação
            if (!response.includes(this.FORM_MARKER)) {
                console.log('[FormTrigger] Marcador não encontrado, retornando resposta original');
                return { success: true, responseText: response };
            }

            console.log('[FormTrigger] Marcador encontrado! Processando JSON...');

            // Encontrar o JSON após o marcador
            const markerIndex = response.indexOf(this.FORM_MARKER);
            const afterMarker = response
                .substring(markerIndex + this.FORM_MARKER.length)
                .trim();

            // Encontrar o JSON
            const jsonStartIndex = afterMarker.indexOf('{');
            if (jsonStartIndex === -1) {
                console.log('[FormTrigger] JSON não encontrado após o marcador');
                return { success: false, error: 'JSON não encontrado', responseText: response };
            }

            // Encontrar o fim do JSON
            let braceCount = 0;
            let jsonEndIndex = -1;
            for (let i = jsonStartIndex; i < afterMarker.length; i++) {
                if (afterMarker[i] === '{') braceCount++;
                if (afterMarker[i] === '}') braceCount--;
                if (braceCount === 0) {
                    jsonEndIndex = i;
                    break;
                }
            }

            if (jsonEndIndex === -1) {
                console.log('[FormTrigger] JSON incompleto');
                return { success: false, error: 'JSON incompleto', responseText: response };
            }

            const jsonString = afterMarker.substring(jsonStartIndex, jsonEndIndex + 1);
            console.log('[FormTrigger] JSON extraído:', jsonString.substring(0, 200) + '...');

            const formData = JSON.parse(jsonString);
            console.log('[FormTrigger] JSON parseado com sucesso. Título:', formData.title);

            // Criar o formulário usando o FormService
            console.log('[FormTrigger] Criando formulário via FormService...');
            const createdForm = await this.formService.create(formData);
            console.log('[FormTrigger] Formulário criado com ID:', createdForm.idForm);

            // Gerar URL de edição do formulário
            const editUrl = `${process.env.CORS || 'http://localhost:3001'}/admin/criar-formulario/${createdForm.idForm}`;
            console.log('[FormTrigger] URL de edição:', editUrl);

            // Gerar nova mensagem de sucesso
            const successMessage = `✅ Formulário criado com sucesso!\n\n📋 **${formData.title}**\n\nO formulário foi salvo no sistema e já está disponível para uso.\n\n🔗 **Editar formulário:** ${editUrl}\n\n📝 **ID do formulário:** ${createdForm.idForm}`;

            console.log('[FormTrigger] Retornando mensagem de sucesso');
            return {
                success: true,
                data: createdForm,
                responseText: successMessage,
            };
        } catch (error) {
            console.error('Erro ao processar criação de formulário:', error);
            const errorMessage = `⚠️ Houve um erro ao criar o formulário automaticamente. Por favor, tente novamente ou crie o formulário manualmente.\n\nErro: ${error.message || 'Erro desconhecido'}`;
            return {
                success: false,
                error: error.message,
                responseText: errorMessage,
            };
        }
    }

    getMarkers(): string[] {
        return [this.FORM_MARKER];
    }
}
