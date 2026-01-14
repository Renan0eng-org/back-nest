import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { FormService } from 'src/forms/form.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  private openaiApiKey: string;
  private openaiBaseUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly FORM_MARKER = 'GERAR-FORM-159753';
  private readonly FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  constructor(
    private prisma: PrismaService,
    private formService: FormService,
  ) {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }
  }

  private readonly SYSTEM_PROMPT = `Você é um especialista em criação de formulários médicos para sistemas públicos de saúde.

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
GERAR-FORM-159753

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

Se qualquer regra acima não for cumprida, a resposta é inválida`;

  async createChat(userId: string, dto: CreateChatDto) {
    const chat = await this.prisma.chat.create({
      data: {
        userId,
        title: dto.title || 'Nova Conversa',
      },
      include: {
        messages: true,
      },
    });

    return chat;
  }

  async getUserChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        userId,
        active: true,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return chats;
  }

  async getChat(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: {
        idChat: chatId,
        userId,
        active: true,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat não encontrado');
    }

    return chat;
  }

  async addMessage(
    chatId: string,
    userId: string,
    dto: CreateMessageDto,
  ) {
    // Verificar se o chat existe e pertence ao usuário
    const chat = await this.getChat(chatId, userId);

    // Salvar mensagem do usuário
    const userMessage = await this.prisma.message.create({
      data: {
        chatId,
        role: 'USER',
        content: dto.content,
      },
    });

    // Obter histórico de mensagens para contexto
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    // Fazer requisição para OpenAI
    let openaiResponse = await this.callOpenAI(messages);

    // Verificar se a resposta contém o marcador de criação de formulário
    let createdForm = null;
    if (openaiResponse.includes(this.FORM_MARKER)) {
      const result = await this.processFormCreation(openaiResponse);
      createdForm = result.form;
      openaiResponse = result.responseText;
    }

    // Salvar resposta do assistente
    const assistantMessage = await this.prisma.message.create({
      data: {
        chatId,
        role: 'ASSISTANT',
        content: openaiResponse,
      },
    });

    // Atualizar título do chat se for a primeira mensagem
    if (messages.length === 1) {
      const title = await this.generateChatTitle(dto.content);
      await this.prisma.chat.update({
        where: { idChat: chatId },
        data: { title },
      });
    }

    return {
      userMessage,
      assistantMessage,
      createdForm,
    };
  }

  private async processFormCreation(response: string): Promise<{ form: any; responseText: string }> {
    try {
      // Encontrar o JSON após o marcador
      const markerIndex = response.indexOf(this.FORM_MARKER);
      if (markerIndex === -1) {
        return { form: null, responseText: response };
      }

      // Extrair o JSON da resposta
      const afterMarker = response.substring(markerIndex + this.FORM_MARKER.length).trim();
      
      // Encontrar o JSON (pode começar com { ou ter texto antes)
      const jsonStartIndex = afterMarker.indexOf('{');
      if (jsonStartIndex === -1) {
        return { form: null, responseText: response };
      }

      // Encontrar o fim do JSON (último })
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
        return { form: null, responseText: response };
      }

      const jsonString = afterMarker.substring(jsonStartIndex, jsonEndIndex + 1);
      const formData = JSON.parse(jsonString);

      // Criar o formulário usando o FormService
      const createdForm = await this.formService.create(formData);

      // Gerar URL de edição do formulário
      const editUrl = `${process.env.CORS}/admin/criar-formulario/${createdForm.idForm}`;

      // Gerar nova mensagem de sucesso
      const successMessage = `✅ Formulário criado com sucesso!\n\n📋 **${formData.title}**\n\nO formulário foi salvo no sistema e já está disponível para uso.\n\n🔗 **Editar formulário:** ${editUrl}`;

      return { form: createdForm, responseText: successMessage };
    } catch (error) {
      console.error('Erro ao processar criação de formulário:', error);
      const errorMessage = `⚠️ Houve um erro ao criar o formulário automaticamente. Por favor, tente novamente ou crie o formulário manualmente.\n\nErro: ${error.message || 'Erro desconhecido'}`;
      return { form: null, responseText: errorMessage };
    }
  }

  async deleteChat(chatId: string, userId: string) {
    const chat = await this.getChat(chatId, userId);

    await this.prisma.chat.update({
      where: { idChat: chatId },
      data: { active: false },
    });

    return { success: true };
  }

  async clearChat(chatId: string, userId: string) {
    const chat = await this.getChat(chatId, userId);

    await this.prisma.message.deleteMany({
      where: { chatId },
    });

    return { success: true };
  }

  private async callOpenAI(messages: any[]): Promise<string> {
    const conversationMessages = messages.map((msg) => ({
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content,
    }));

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
            {
              role: 'system',
              content: this.SYSTEM_PROMPT,
            },
            ...conversationMessages,
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new BadRequestException(
          `Erro ao chamar OpenAI: ${error.error?.message || 'Erro desconhecido'}`,
        );
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
    } catch (error) {
      console.error('Erro ao chamar OpenAI:', error);
      throw new BadRequestException('Erro ao processar mensagem. Tente novamente.');
    }
  }

  private async generateChatTitle(userMessage: string): Promise<string> {
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
            {
              role: 'user',
              content: `Gere um título conciso (máximo 50 caracteres) para uma conversa que começa com: "${userMessage}". Retorne apenas o título, sem aspas ou explicações.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0]?.message?.content?.trim() || 'Nova Conversa';
      }

      return 'Nova Conversa';
    } catch (error) {
      console.error('Erro ao gerar título:', error);
      return 'Nova Conversa';
    }
  }
}
