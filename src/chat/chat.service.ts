import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Form, User } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma.service';
import { FormService } from 'src/forms/form.service';
import { SexDto } from 'src/patients/dto/register-patient.dto';
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
      throw new Error('OPENAI_API_KEY não configurada ' + process.env.OPENAI_API_KEY);
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
            const patientResult = await this.processPatientCreation(openaiResponse, marker);
            if (patientResult.success && patientResult.patient) {
              createdPatient = patientResult.patient;
              openaiResponse = `✅ Paciente criado com sucesso!\n\n👤 **${createdPatient.name}**\n\n📧 Email: ${createdPatient.email}\n📋 CPF: ${createdPatient.cpf || 'Não informado'}\n\nO paciente foi cadastrado no sistema e já está disponível.\n\n🔗 **Ver paciente:** ${process.env.CORS || 'http://localhost:3001'}/admin/editar-paciente/${createdPatient.idUser}`;
            } else {
              openaiResponse = `❌ Não foi possível criar o paciente.\n\n**Erro:** ${patientResult.error}\n\nPor favor, corrija os dados e tente novamente.`;
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

  private async processPatientCreation(response: string, marker: string): Promise<{ success: boolean; patient?: User; error?: string }> {
    try {
      console.log('[ChatService] Processando criação de paciente...');

      const markerIndex = response.indexOf(marker);
      if (markerIndex === -1) {
        console.log('[ChatService] Marcador de paciente não encontrado');
        return { success: false, error: 'Marcador de paciente não encontrado na resposta' };
      }

      const afterMarker = response.substring(markerIndex + marker.length).trim();

      const jsonStartIndex = afterMarker.indexOf('{');
      if (jsonStartIndex === -1) {
        console.log('[ChatService] JSON de paciente não encontrado');
        return { success: false, error: 'JSON com dados do paciente não encontrado na resposta' };
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
        console.log('[ChatService] JSON de paciente incompleto');
        return { success: false, error: 'JSON com dados do paciente está incompleto ou mal formatado' };
      }

      const jsonString = afterMarker.substring(jsonStartIndex, jsonEndIndex + 1);
      console.log('[ChatService] JSON de paciente extraído:', jsonString.substring(0, 200) + '...');

      const patientData = JSON.parse(jsonString);
      console.log('[ChatService] Criando paciente:', patientData.name);

      // Mapear sexo para o formato esperado pelo DTO
      let sexo: SexDto | undefined;
      if (patientData.sexo) {
        const sexoNormalizado = patientData.sexo.toLowerCase();
        if (sexoNormalizado.includes('masculino') || sexoNormalizado === 'male' || sexoNormalizado === 'm') {
          sexo = SexDto.MASCULINO;
        } else if (sexoNormalizado.includes('feminino') || sexoNormalizado === 'female' || sexoNormalizado === 'f') {
          sexo = SexDto.FEMININO;
        } else {
          sexo = SexDto.OUTRO;
        }
      }

      // Converter arrays para strings se necessário
      const medicamentos = Array.isArray(patientData.medicamentos)
        ? patientData.medicamentos.join(', ')
        : patientData.medicamentos;

      const alergias = Array.isArray(patientData.alergias)
        ? patientData.alergias.join(', ')
        : patientData.alergias;

      // Converter birthDate para formato ISO-8601 DateTime completo
      let birthDate: string | undefined;
      if (patientData.birthDate) {
        // Se já é um DateTime completo, usar como está
        if (patientData.birthDate.includes('T')) {
          birthDate = patientData.birthDate;
        } else {
          // Se é apenas data (YYYY-MM-DD), adicionar hora
          birthDate = `${patientData.birthDate}T00:00:00.000Z`;
        }
      }

      const registerData = {
        name: patientData.name,
        email: patientData.email,
        password: patientData.password || 'Senha@123',
        cpf: patientData.cpf,
        birthDate,
        sexo,
        unidadeSaude: patientData.unidadeSaude,
        medicamentos,
        exames: patientData.exames === true || patientData.exames === 'true' || patientData.exames === 'sim',
        examesDetalhes: patientData.examesDetalhes,
        alergias,
      };

      console.log('[ChatService] Dados para criação do paciente:', JSON.stringify(registerData, null, 2));

      const createdPatient = await this.patientsService.create(registerData);
      console.log('[ChatService] Paciente criado com ID:', createdPatient.idUser);

      return { success: true, patient: createdPatient as unknown as User };
    } catch (error: any) {
      console.error('[ChatService] Erro ao processar criação de paciente:', error?.message || error);
      console.error('[ChatService] Detalhes do erro:', JSON.stringify(error?.response || error, null, 2));

      // Extrair mensagem de erro legível
      let errorMessage = 'Erro desconhecido ao criar paciente';
      if (error?.response?.message) {
        errorMessage = typeof error.response.message === 'string'
          ? error.response.message
          : JSON.stringify(error.response.message);
      } else if (error?.message) {
        // Extrair a parte legível do erro do Prisma
        if (error.message.includes('Invalid value for argument')) {
          const match = error.message.match(/Invalid value for argument `(\w+)`: (.+)/);
          if (match) {
            errorMessage = `Campo '${match[1]}' inválido: ${match[2]}`;
          } else {
            errorMessage = error.message.split('\n').pop() || error.message;
          }
        } else {
          errorMessage = error.message;
        }
      }

      return { success: false, error: errorMessage };
    }
  }
}
