import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Form, User } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma.service';
import { FormService } from 'src/forms/form.service';
import { PatientsService } from 'src/patients/patients.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { FinalPromptConfig } from './triggers/interfaces/trigger.interface';
import { TriggerDbService } from './triggers/trigger-db.service';
@Injectable()
export class ChatService {
  private openaiApiKey: string;
  private openaiBaseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(
    private prisma: PrismaService,
    private triggerDbService: TriggerDbService,
    private formService: FormService,
    private patientsService: PatientsService,
  ) {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }
  }

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
    const chat = await this.getChat(chatId, userId);

    const userMessage = await this.prisma.message.create({
      data: {
        chatId,
        role: 'USER',
        content: dto.content,
      },
    });

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    const detection = await this.triggerDbService.detectTrigger(dto.content, messages);
    const trigger = detection.trigger;

    const promptConfig = trigger
      ? await this.triggerDbService.getPromptConfig(trigger.triggerId)
      : await this.triggerDbService.getPromptConfig('default');

    console.log(`[ChatService] Trigger ativada: ${trigger?.name || 'default'} (score: ${detection.score})`);

    let openaiResponse = await this.callOpenAI(messages, {
      systemPrompt: promptConfig?.systemPrompt || 'Você é um assistente útil.',
      temperature: promptConfig?.temperature || 0.7,
      maxTokens: promptConfig?.maxTokens || 2048,
      triggers: trigger ? [trigger] : [],
    });

    let createdForm: Form | null = null;
    let createdPatient: User | null = null;
    if (trigger && promptConfig?.markers && promptConfig.markers.length > 0) {
      for (const marker of promptConfig.markers) {
        if (openaiResponse.includes(marker)) {
          if (marker === 'GERAR-FORM-159753') {
            createdForm = await this.processFormCreation(openaiResponse, marker);
            if (createdForm) {
              openaiResponse = `✅ Formulário criado com sucesso!\n\n📋 **${createdForm.title}**\n\nO formulário foi salvo no sistema e já está disponível para uso.\n\n🔗 **Editar formulário:** ${process.env.CORS || 'http://localhost:3001'}/admin/criar-formulario/${createdForm.idForm}`;
            }
          }
          if (marker === 'GERAR-PATIENTE-159753') {
            createdPatient = await this.processPatientCreation(openaiResponse, marker);
            if (createdPatient) {
              openaiResponse = `✅ Paciente criado com sucesso!\n\n📋 **${createdPatient.name}**\n\nO paciente foi salvo no sistema e já está disponível para uso.\n\n🔗 **Editar paciente:** ${process.env.CORS || 'http://localhost:3001'}/admin/editar-paciente/${createdPatient.idUser}`;
            }
          }
          break;
        }
      }
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

  private async callOpenAI(
    messages: any[],
    promptConfig: FinalPromptConfig | any,
  ): Promise<string> {
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
          model: promptConfig.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: promptConfig.systemPrompt,
            },
            ...conversationMessages,
          ],
          temperature: promptConfig.temperature || 0.7,
          max_tokens: promptConfig.maxTokens || 2048,
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

  private async processFormCreation(response: string, marker: string): Promise<Form | null> {
    try {
      console.log('[ChatService] Processando criação de formulário...');

      const markerIndex = response.indexOf(marker);
      if (markerIndex === -1) {
        console.log('[ChatService] Marcador não encontrado');
        return null;
      }

      const afterMarker = response.substring(markerIndex + marker.length).trim();

      const jsonStartIndex = afterMarker.indexOf('{');
      if (jsonStartIndex === -1) {
        console.log('[ChatService] JSON não encontrado');
        return null;
      }

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
        console.log('[ChatService] JSON incompleto');
        return null;
      }

      const jsonString = afterMarker.substring(jsonStartIndex, jsonEndIndex + 1);
      console.log('[ChatService] JSON extraído:', jsonString.substring(0, 200) + '...');

      const formData = JSON.parse(jsonString);
      console.log('[ChatService] Criando formulário:', formData.title);

      const createdForm = await this.formService.create(formData);
      console.log('[ChatService] Formulário criado com ID:', createdForm.idForm);

      return createdForm;
    } catch (error) {
      console.error('Erro ao processar criação de formulário:', error);
      return null;
    }
  }

  private async processPatientCreation(response: string, marker: string): Promise<any | null> {
    try {
      console.log('[ChatService] Processando criação de paciente...');
      const markerIndex = response.indexOf(marker);
      if (markerIndex === -1) return null;

      const afterMarker = response.substring(markerIndex + marker.length).trim();
      const jsonStartIndex = afterMarker.indexOf('{');
      if (jsonStartIndex === -1) return null;

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
      if (jsonEndIndex === -1) return null;

      const jsonString = afterMarker.substring(jsonStartIndex, jsonEndIndex + 1);
      const patientData = JSON.parse(jsonString);

      // Consertos importantes
      if (!patientData.name || !patientData.email || !patientData.password) {
        throw new BadRequestException('Campos obrigatórios faltando');
      }
      if (patientData.birthDate) patientData.birthDate = new Date(patientData.birthDate);

      console.log('[ChatService] Criando paciente:', patientData);
      const createdPatient = await this.patientsService.create({
        name:   patientData.name,
        email:  patientData.email,
        cpf:  patientData.cpf,
        birthDate: patientData.birthDate,
        sexo:  patientData.sexo,
        unidadeSaude:  patientData.unidadeSaude,
        medicamentos:  patientData.medicamentos,
        exames: patientData.exames,
        examesDetalhes: patientData.examesDetalhes,
        alergias: patientData.alergias,
        password: patientData.password
      });
      console.log('[ChatService] Paciente criado com ID:', createdPatient.idUser);

      return createdPatient;
    } catch (error) {
      console.error('Erro ao processar criação de paciente:', error);
      return null;
    }
  }

}
