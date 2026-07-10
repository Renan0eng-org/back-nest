import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatLogType, EnumUserType, Form, User } from '@prisma/client';
import { AcessoService } from 'src/acesso/acesso.service';
import { PrismaService } from 'src/database/prisma.service';
import { FormService } from 'src/forms/form.service';
import { SexDto } from 'src/patients/dto/register-patient.dto';
import { PatientsService } from 'src/patients/patients.service';
import { UserService } from 'src/user/user.service';
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
    private userService: UserService,
    private acessoService: AcessoService,
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

  private async logChat(data: {
    chatId: string;
    userId: string;
    type: ChatLogType;
    triggerName?: string;
    triggerId?: string;
    score?: number;
    marker?: string;
    actionResult?: string;
    errorMessage?: string;
    userMessage?: string;
    aiResponse?: string;
    metadata?: any;
    duration?: number;
  }) {
    try {
      await this.prisma.chatLog.create({ data });
    } catch (e) {
      console.error('[ChatService] Erro ao salvar log:', e);
    }
  }

  async addMessage(
    chatId: string,
    userId: string,
    dto: CreateMessageDto,
  ) {
    const startTime = Date.now();
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

    // Log trigger detection
    await this.logChat({
      chatId,
      userId,
      type: ChatLogType.TRIGGER_DETECTED,
      triggerName: trigger?.name || 'default',
      triggerId: trigger?.triggerId || 'default',
      score: detection.score,
      userMessage: dto.content,
      metadata: {
        stackedTriggers: detection.stackedTriggers?.map((t: any) => t.name),
        allKeywordsMatched: trigger?.keywords?.filter((k: any) =>
          dto.content.toLowerCase().includes(k.word.toLowerCase())
        ).map((k: any) => k.word),
      },
    });

    let openaiResponse: string;
    try {
      openaiResponse = await this.callOpenAI(messages, {
        systemPrompt: promptConfig?.systemPrompt || 'Você é um assistente útil.',
        temperature: promptConfig?.temperature || 0.7,
        maxTokens: promptConfig?.maxTokens || 2048,
        triggers: trigger ? [trigger] : [],
      });
    } catch (error: any) {
      await this.logChat({
        chatId,
        userId,
        type: ChatLogType.ACTION_ERROR,
        triggerName: trigger?.name,
        errorMessage: `OpenAI Error: ${error?.message || 'Unknown'}`,
        userMessage: dto.content,
        duration: Date.now() - startTime,
      });
      throw error;
    }

    let createdForm: Form | null = null;
    let processedMarker: string | null = null;
    if (trigger && promptConfig?.markers && promptConfig.markers.length > 0) {
      for (const marker of promptConfig.markers) {
        if (openaiResponse.includes(marker)) {
          processedMarker = marker;

          // Log marker detection
          await this.logChat({
            chatId,
            userId,
            type: ChatLogType.MARKER_PROCESSED,
            triggerName: trigger.name,
            triggerId: trigger.triggerId,
            marker,
            userMessage: dto.content,
          });

          try {
            if (marker === 'GERAR-FORM-159753') {
              createdForm = await this.processFormCreation(openaiResponse, marker);
              if (createdForm) {
                openaiResponse = `✅ Formulário criado com sucesso!\n\n📋 **${createdForm.title}**\n\nO formulário foi salvo no sistema e já está disponível para uso.\n\n🔗 **Editar formulário:** ${process.env.CORS || 'http://localhost:3001'}/admin/criar-formulario/${createdForm.idForm}`;
                await this.logChat({
                  chatId, userId,
                  type: ChatLogType.ACTION_SUCCESS,
                  triggerName: trigger.name, marker,
                  actionResult: `Formulário criado: ${createdForm.title} (${createdForm.idForm})`,
                });
              }
            }
            if (marker === 'GERAR-PATIENTE-159753') {
              const patientResult = await this.processPatientCreation(openaiResponse, marker);
              openaiResponse = patientResult.message;
              await this.logChat({
                chatId, userId,
                type: patientResult.success ? ChatLogType.ACTION_SUCCESS : ChatLogType.ACTION_ERROR,
                triggerName: trigger.name, marker,
                actionResult: patientResult.success ? patientResult.message.substring(0, 500) : undefined,
                errorMessage: !patientResult.success ? patientResult.message : undefined,
              });
            }
            if (marker === 'ALTERAR-STATUS-PACIENTE-159753') {
              const statusResult = await this.processPatientStatusChange(openaiResponse, marker);
              if (statusResult.success && statusResult.patient) {
                const p = statusResult.patient;
                openaiResponse = `✅ Status do paciente atualizado com sucesso!\n\n👤 **${p.name}**\n📋 CPF: ${p.cpf || 'Não informado'}\n📧 Email: ${p.email}\n\n📌 **Status atual:**\n- Ativo: ${p.active ? 'Sim' : 'Não'}\n- Alta: ${p.alta ? 'Sim' : 'Não'}${p.altaAt ? `\n- Data da alta: ${new Date(p.altaAt).toLocaleDateString('pt-BR')}` : ''}\n\n🔗 **Ver paciente:** ${process.env.CORS || 'http://localhost:3001'}/admin/editar-paciente/${p.idUser}`;
                await this.logChat({
                  chatId, userId,
                  type: ChatLogType.ACTION_SUCCESS,
                  triggerName: trigger.name, marker,
                  actionResult: `Status alterado: ${p.name} (active=${p.active}, alta=${p.alta})`,
                });
              } else {
                openaiResponse = `❌ Não foi possível alterar o status do paciente.\n\n**Erro:** ${statusResult.error}\n\nPor favor, verifique os dados e tente novamente.`;
                await this.logChat({
                  chatId, userId,
                  type: ChatLogType.ACTION_ERROR,
                  triggerName: trigger.name, marker,
                  errorMessage: statusResult.error,
                });
              }
            }
            if (marker === 'GERAR-USUARIO-159753') {
              const userResult = await this.processUserCreation(openaiResponse, marker);
              openaiResponse = userResult.message;
              await this.logChat({
                chatId, userId,
                type: userResult.success ? ChatLogType.ACTION_SUCCESS : ChatLogType.ACTION_ERROR,
                triggerName: trigger.name, marker,
                actionResult: userResult.success ? userResult.message.substring(0, 500) : undefined,
                errorMessage: !userResult.success ? userResult.message : undefined,
              });
            }
          } catch (error: any) {
            await this.logChat({
              chatId, userId,
              type: ChatLogType.ACTION_ERROR,
              triggerName: trigger.name, marker,
              errorMessage: error?.message || 'Erro desconhecido ao processar marcador',
            });
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

    // Log completo da mensagem
    await this.logChat({
      chatId,
      userId,
      type: ChatLogType.MESSAGE_RECEIVED,
      triggerName: trigger?.name || 'default',
      triggerId: trigger?.triggerId || 'default',
      score: detection.score,
      marker: processedMarker || undefined,
      userMessage: dto.content,
      aiResponse: openaiResponse.substring(0, 2000),
      duration: Date.now() - startTime,
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

  // ============================================
  // ANALYTICS
  // ============================================

  async getChatAnalytics(filters?: {
    startDate?: string;
    endDate?: string;
    triggerName?: string;
    type?: string;
    userId?: string;
  }) {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z');
    }
    if (filters?.triggerName) where.triggerName = filters.triggerName;
    if (filters?.type) where.type = filters.type as ChatLogType;
    if (filters?.userId) where.userId = filters.userId;

    const [
      logs,
      totalMessages,
      totalTriggers,
      totalErrors,
      totalSuccess,
      triggerCounts,
      dailyStats,
      avgDuration,
    ] = await Promise.all([
      this.prisma.chatLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          user: { select: { idUser: true, name: true, email: true } },
          chat: { select: { idChat: true, title: true } },
        },
      }),
      this.prisma.chatLog.count({ where: { ...where, type: ChatLogType.MESSAGE_RECEIVED } }),
      this.prisma.chatLog.count({ where: { ...where, type: ChatLogType.TRIGGER_DETECTED } }),
      this.prisma.chatLog.count({ where: { ...where, type: ChatLogType.ACTION_ERROR } }),
      this.prisma.chatLog.count({ where: { ...where, type: ChatLogType.ACTION_SUCCESS } }),
      this.prisma.chatLog.groupBy({
        by: ['triggerName'],
        where: { ...where, type: ChatLogType.TRIGGER_DETECTED, triggerName: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.$queryRaw`
        SELECT
          DATE("createdAt") as date,
          COUNT(*) FILTER (WHERE "type" = 'MESSAGE_RECEIVED') as messages,
          COUNT(*) FILTER (WHERE "type" = 'TRIGGER_DETECTED') as triggers,
          COUNT(*) FILTER (WHERE "type" = 'ACTION_ERROR') as errors,
          COUNT(*) FILTER (WHERE "type" = 'ACTION_SUCCESS') as successes
        FROM "ChatLog"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 30
      `,
      this.prisma.chatLog.aggregate({
        where: { ...where, type: ChatLogType.MESSAGE_RECEIVED, duration: { not: null } },
        _avg: { duration: true },
      }),
    ]);

    const markerCounts = await this.prisma.chatLog.groupBy({
      by: ['marker'],
      where: { ...where, type: ChatLogType.MARKER_PROCESSED, marker: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const topUsers = await this.prisma.chatLog.groupBy({
      by: ['userId'],
      where: { ...where, type: ChatLogType.MESSAGE_RECEIVED },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const userIds = topUsers.map(u => u.userId);
    const users = await this.prisma.user.findMany({
      where: { idUser: { in: userIds } },
      select: { idUser: true, name: true, email: true },
    });
    const userMap = new Map(users.map(u => [u.idUser, u]));

    return {
      summary: {
        totalMessages,
        totalTriggers,
        totalErrors,
        totalSuccess,
        avgDuration: Math.round(avgDuration._avg.duration || 0),
        errorRate: totalTriggers > 0 ? Math.round((totalErrors / totalTriggers) * 100) : 0,
        successRate: totalTriggers > 0 ? Math.round((totalSuccess / totalTriggers) * 100) : 0,
      },
      triggerCounts: triggerCounts.map(t => ({
        name: t.triggerName,
        count: t._count.id,
      })),
      markerCounts: markerCounts.map(m => ({
        marker: m.marker,
        count: m._count.id,
      })),
      dailyStats,
      topUsers: topUsers.map(u => ({
        user: userMap.get(u.userId) || { idUser: u.userId, name: 'Desconhecido', email: '' },
        messageCount: u._count.id,
      })),
      logs,
    };
  }

  async getChatLogTypes() {
    return Object.values(ChatLogType);
  }

  async getDistinctTriggerNames() {
    const result = await this.prisma.chatLog.findMany({
      where: { triggerName: { not: null } },
      select: { triggerName: true },
      distinct: ['triggerName'],
    });
    return result.map(r => r.triggerName).filter(Boolean);
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

  private async processPatientCreation(response: string, marker: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[ChatService] Processando criação de paciente(s)...');

      const markerIndex = response.indexOf(marker);
      if (markerIndex === -1) {
        return { success: false, message: '❌ Marcador de paciente não encontrado na resposta.' };
      }

      const afterMarker = response.substring(markerIndex + marker.length).trim();

      // Try to find a JSON array or object
      const arrayStart = afterMarker.indexOf('[');
      const objStart = afterMarker.indexOf('{');

      let startIndex: number;
      let isArray: boolean;

      if (arrayStart !== -1 && (objStart === -1 || arrayStart < objStart)) {
        startIndex = arrayStart;
        isArray = true;
      } else if (objStart !== -1) {
        startIndex = objStart;
        isArray = false;
      } else {
        return { success: false, message: '❌ JSON com dados do(s) paciente(s) não encontrado na resposta.' };
      }

      const openChar = isArray ? '[' : '{';
      const closeChar = isArray ? ']' : '}';
      let depth = 0;
      let endIndex = -1;
      for (let i = startIndex; i < afterMarker.length; i++) {
        if (afterMarker[i] === openChar) depth++;
        if (afterMarker[i] === closeChar) depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }

      if (endIndex === -1) {
        return { success: false, message: '❌ JSON com dados do(s) paciente(s) está incompleto.' };
      }

      const jsonString = afterMarker.substring(startIndex, endIndex + 1);
      const parsed = JSON.parse(jsonString);
      const patientsData: any[] = Array.isArray(parsed) ? parsed : [parsed];

      if (patientsData.length === 0) {
        return { success: false, message: '❌ Nenhum paciente encontrado nos dados.' };
      }

      const results: string[] = [];
      let successCount = 0;
      let errorCount = 0;
      const baseUrl = process.env.CORS || 'http://localhost:3001';

      for (const patientData of patientsData) {
        try {
          let sexo: SexDto | undefined;
          if (patientData.sexo) {
            const sexoNorm = patientData.sexo.toLowerCase();
            if (sexoNorm.includes('masculino') || sexoNorm === 'male' || sexoNorm === 'm') {
              sexo = SexDto.MASCULINO;
            } else if (sexoNorm.includes('feminino') || sexoNorm === 'female' || sexoNorm === 'f') {
              sexo = SexDto.FEMININO;
            } else {
              sexo = SexDto.OUTRO;
            }
          }

          const medicamentos = Array.isArray(patientData.medicamentos)
            ? patientData.medicamentos.join(', ')
            : patientData.medicamentos;

          const alergias = Array.isArray(patientData.alergias)
            ? patientData.alergias.join(', ')
            : patientData.alergias;

          let birthDate: string | undefined;
          if (patientData.birthDate) {
            birthDate = patientData.birthDate.includes('T')
              ? patientData.birthDate
              : `${patientData.birthDate}T00:00:00.000Z`;
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

          const created = await this.patientsService.create(registerData);
          successCount++;
          results.push(`✅ **${created.name}** — ${created.email}\n🔗 ${baseUrl}/admin/editar-paciente/${created.idUser}`);
        } catch (error: any) {
          errorCount++;
          let errMsg = 'Erro desconhecido';
          if (error?.response?.message) {
            errMsg = typeof error.response.message === 'string'
              ? error.response.message
              : JSON.stringify(error.response.message);
          } else if (error?.message) {
            if (error.message.includes('Invalid value for argument')) {
              const match = error.message.match(/Invalid value for argument `(\w+)`: (.+)/);
              errMsg = match ? `Campo '${match[1]}' inválido: ${match[2]}` : error.message.split('\n').pop() || error.message;
            } else {
              errMsg = error.message;
            }
          }
          results.push(`❌ **${patientData.name || patientData.email || 'Desconhecido'}**: ${errMsg}`);
        }
      }

      const total = patientsData.length;
      let header: string;
      if (errorCount === 0) {
        header = total === 1 ? '✅ Paciente criado com sucesso!' : `✅ ${successCount} paciente(s) criado(s) com sucesso!`;
      } else if (successCount === 0) {
        header = total === 1 ? '❌ Não foi possível criar o paciente.' : `❌ Nenhum dos ${total} pacientes foi criado.`;
      } else {
        header = `⚠️ ${successCount} de ${total} paciente(s) criado(s). ${errorCount} erro(s).`;
      }

      return { success: successCount > 0, message: `${header}\n\n${results.join('\n\n')}` };
    } catch (error: any) {
      console.error('[ChatService] Erro ao processar criação de paciente:', error?.message || error);
      return { success: false, message: `❌ Erro ao processar criação de paciente: ${error?.message || 'Erro desconhecido'}` };
    }
  }

  private async processUserCreation(response: string, marker: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[ChatService] Processando criação de usuário(s)...');

      const markerIndex = response.indexOf(marker);
      if (markerIndex === -1) {
        return { success: false, message: '❌ Marcador de criação de usuário não encontrado na resposta.' };
      }

      const afterMarker = response.substring(markerIndex + marker.length).trim();

      // Try to find a JSON array or object
      let jsonString: string;
      const arrayStart = afterMarker.indexOf('[');
      const objStart = afterMarker.indexOf('{');

      let startIndex: number;
      let isArray: boolean;

      if (arrayStart !== -1 && (objStart === -1 || arrayStart < objStart)) {
        startIndex = arrayStart;
        isArray = true;
      } else if (objStart !== -1) {
        startIndex = objStart;
        isArray = false;
      } else {
        return { success: false, message: '❌ JSON com dados do(s) usuário(s) não encontrado na resposta.' };
      }

      const openChar = isArray ? '[' : '{';
      const closeChar = isArray ? ']' : '}';
      let depth = 0;
      let endIndex = -1;
      for (let i = startIndex; i < afterMarker.length; i++) {
        if (afterMarker[i] === openChar) depth++;
        if (afterMarker[i] === closeChar) depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }

      if (endIndex === -1) {
        return { success: false, message: '❌ JSON com dados do(s) usuário(s) está incompleto.' };
      }

      jsonString = afterMarker.substring(startIndex, endIndex + 1);
      const parsed = JSON.parse(jsonString);

      // Normalize to array
      const usersData: any[] = Array.isArray(parsed) ? parsed : [parsed];

      if (usersData.length === 0) {
        return { success: false, message: '❌ Nenhum usuário encontrado nos dados.' };
      }

      // Fetch all access levels to match by name
      const niveisAcesso = await this.acessoService.findNiveisComMenus();
      const niveisList = Array.isArray(niveisAcesso) ? niveisAcesso : (niveisAcesso as any).data || [];

      // Find "Não Autorizado" level as default
      const defaultNivel = niveisList.find((n: any) =>
        n.nome.toLowerCase().includes('não autorizado') ||
        n.nome.toLowerCase().includes('nao autorizado')
      );
      const defaultNivelId = defaultNivel?.idNivelAcesso || (niveisList.length > 0 ? niveisList[0].idNivelAcesso : 1);

      const results: string[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const userData of usersData) {
        try {
          // Try to extract name/email from various JSON structures the AI might use
          const name = userData.name || userData.nome || userData.nomeCompleto || userData.nome_completo;
          const email = userData.email || userData.e_mail || userData.emailAddress;

          if (!name || !email) {
            errorCount++;
            results.push(`❌ **${name || email || 'Desconhecido'}**: Nome e email são obrigatórios.`);
            continue;
          }

          // Resolve access level by name
          let nivelAcessoId = defaultNivelId;
          const nivelRaw = userData.nivelAcesso || userData.nivel_acesso || userData.nivelacesso || userData.nivel;
          if (nivelRaw) {
            const nivelName = String(nivelRaw).toLowerCase().trim();
            const found = niveisList.find((n: any) => n.nome.toLowerCase().trim() === nivelName);
            if (found) {
              nivelAcessoId = found.idNivelAcesso;
            } else {
              results.push(`⚠️ **${name}**: Nível "${nivelRaw}" não encontrado. Usando "${defaultNivel?.nome || 'padrão'}".`);
            }
          }

          // Determine user type
          let type: EnumUserType = EnumUserType.USUARIO;
          const typeRaw = userData.type || userData.tipo;
          if (typeRaw) {
            const t = String(typeRaw).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
            if (t === 'MEDICO') type = EnumUserType.MEDICO;
          }

          const password = userData.password || userData.senha || 'Senha@123';
          const cpf = userData.cpf || '';
          const phone = userData.phone || userData.telefone || userData.celular;

          const createData = {
            name,
            email,
            password: String(password),
            cpf: String(cpf),
            phone,
            cep: userData.cep,
            nivelAcessoId,
            type,
            active: userData.active !== undefined ? userData.active : true,
          };

          const created = await this.userService.create(createData);
          successCount++;

          const nivelNome = niveisList.find((n: any) => n.idNivelAcesso === nivelAcessoId)?.nome || 'N/A';
          results.push(`✅ **${created.name}** — ${created.email} (${nivelNome})`);
        } catch (error: any) {
          errorCount++;
          const label = userData.name || userData.nome || userData.email || 'Desconhecido';
          const errMsg = error?.response?.message || error?.message || 'Erro desconhecido';
          results.push(`❌ **${label}**: ${errMsg}`);
        }
      }

      const total = usersData.length;
      let header: string;
      if (errorCount === 0) {
        header = total === 1
          ? '✅ Usuário criado com sucesso!'
          : `✅ ${successCount} usuário(s) criado(s) com sucesso!`;
      } else if (successCount === 0) {
        header = total === 1
          ? '❌ Não foi possível criar o usuário.'
          : `❌ Nenhum dos ${total} usuários foi criado.`;
      } else {
        header = `⚠️ ${successCount} de ${total} usuário(s) criado(s). ${errorCount} erro(s).`;
      }

      const baseUrl = process.env.CORS || 'http://localhost:3001';
      const link = `\n\n🔗 **Ver usuários:** ${baseUrl}/admin/usuarios`;
      const message = `${header}\n\n${results.join('\n')}${successCount > 0 ? link : ''}`;
      return { success: successCount > 0, message };
    } catch (error: any) {
      console.error('[ChatService] Erro ao processar criação de usuário:', error?.message || error);
      return { success: false, message: `❌ Erro ao processar criação de usuário: ${error?.message || 'Erro desconhecido'}` };
    }
  }

  private async processPatientStatusChange(response: string, marker: string): Promise<{ success: boolean; patient?: User; error?: string }> {
    try {
      console.log('[ChatService] Processando alteração de status de paciente...');

      const markerIndex = response.indexOf(marker);
      if (markerIndex === -1) {
        return { success: false, error: 'Marcador de alteração de status não encontrado na resposta' };
      }

      const afterMarker = response.substring(markerIndex + marker.length).trim();

      const jsonStartIndex = afterMarker.indexOf('{');
      if (jsonStartIndex === -1) {
        return { success: false, error: 'JSON com dados de alteração não encontrado na resposta' };
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
        return { success: false, error: 'JSON com dados de alteração está incompleto ou mal formatado' };
      }

      const jsonString = afterMarker.substring(jsonStartIndex, jsonEndIndex + 1);
      console.log('[ChatService] JSON de status extraído:', jsonString);

      const statusData = JSON.parse(jsonString);

      // Encontrar o paciente por CPF ou email
      let patient: User | null = null;
      if (statusData.cpf) {
        patient = await this.prisma.user.findUnique({ where: { cpf: statusData.cpf } });
      } else if (statusData.email) {
        patient = await this.prisma.user.findUnique({ where: { email: statusData.email } });
      }

      if (!patient) {
        return { success: false, error: 'Paciente não encontrado no sistema com o CPF/email informado' };
      }

      // Montar dados de atualização
      const updateData: any = {};

      if (typeof statusData.active === 'boolean') {
        updateData.active = statusData.active;
      }

      if (typeof statusData.alta === 'boolean') {
        updateData.alta = statusData.alta;
        updateData.altaAt = statusData.alta ? new Date() : null;
        // Alta implica desativar o paciente
        if (statusData.alta) {
          updateData.active = false;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'Nenhuma alteração especificada (active ou alta)' };
      }

      const updatedPatient = await this.prisma.user.update({
        where: { idUser: patient.idUser },
        data: updateData,
      });

      console.log('[ChatService] Status do paciente atualizado:', updatedPatient.idUser);

      return { success: true, patient: updatedPatient };
    } catch (error: any) {
      console.error('[ChatService] Erro ao alterar status do paciente:', error?.message || error);
      return { success: false, error: error?.message || 'Erro desconhecido ao alterar status do paciente' };
    }
  }
}
