import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../push/push.service';

export interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  route?: string; // Rota para navegação no app (ex: 'form/123', 'appointment/456')
}

/**
 * Serviço utilitário para envio de notificações push
 * Pode ser usado em qualquer módulo para enviar notificações facilmente
 */
@Injectable()
export class NotificationHelperService {
  private readonly logger = new Logger(NotificationHelperService.name);
  private readonly defaultImageUrl = undefined;

  constructor(private readonly pushService: PushService) {}

  /**
   * Envia notificação para um usuário específico
   * @param userId ID do usuário
   * @param payload Dados da notificação
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const success = await this.pushService.sendToUser(userId, {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl || this.defaultImageUrl,
        data: {
          ...payload.data,
          ...(payload.route ? { route: payload.route } : {}),
        },
      });

      if (success) {
        this.logger.log(`Notificação enviada para usuário ${userId}: ${payload.title}`);
      } else {
        this.logger.warn(`Falha ao enviar notificação para usuário ${userId}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Erro ao enviar notificação para usuário ${userId}:`, error);
      return false;
    }
  }

  /**
   * Envia notificação para múltiplos usuários
   * @param userIds Array de IDs de usuários
   * @param payload Dados da notificação
   */
  async sendToMultipleUsers(userIds: string[], payload: NotificationPayload): Promise<number> {
    try {
      const successCount = await this.pushService.sendToMultipleUsers(userIds, {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl || this.defaultImageUrl,
        data: {
          ...payload.data,
          ...(payload.route ? { route: payload.route } : {}),
        },
      });

      this.logger.log(`Notificação enviada para ${successCount}/${userIds.length} usuários: ${payload.title}`);
      return successCount;
    } catch (error) {
      this.logger.error(`Erro ao enviar notificação para múltiplos usuários:`, error);
      return 0;
    }
  }

  /**
   * Notifica sobre novo formulário pendente
   * @param userId ID do paciente
   * @param formTitle Título do formulário
   * @param formId ID do formulário (opcional)
   */
  async notifyNewPendingForm(userId: string, formTitle: string, formId?: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Novo Formulário Pendente',
      body: `Você tem um novo formulário para responder: ${formTitle}`,
      route: formId ? `form/${formId}` : undefined,
      data: {
        type: 'pending_form',
        formId: formId || '',
        formTitle: formTitle,
      },
    });
  }

  /**
   * Notifica sobre agendamento de consulta
   * @param userId ID do paciente
   * @param appointmentDate Data da consulta
   * @param appointmentId ID do agendamento (opcional)
   */
  async notifyAppointment(userId: string, appointmentDate: string, appointmentId?: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Consulta Agendada',
      body: `Sua consulta foi agendada para ${appointmentDate}`,
      route: appointmentId ? `appointment/${appointmentId}` : 'appointments',
      data: {
        type: 'appointment',
        appointmentId: appointmentId || '',
        date: appointmentDate,
      },
    });
  }

  /**
   * Notifica sobre lembrete de consulta
   * @param userId ID do paciente
   * @param appointmentDate Data da consulta
   * @param appointmentId ID do agendamento (opcional)
   */
  async notifyAppointmentReminder(userId: string, appointmentDate: string, appointmentId?: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Lembrete de Consulta',
      body: `Lembrete: Você tem uma consulta agendada para ${appointmentDate}`,
      route: appointmentId ? `appointment/${appointmentId}` : 'appointments',
      data: {
        type: 'appointment_reminder',
        appointmentId: appointmentId || '',
        date: appointmentDate,
      },
    });
  }

  /**
   * Notifica sobre atendimento concluído
   * @param userId ID do paciente
   * @param attendanceId ID do atendimento (opcional)
   */
  async notifyAttendanceCompleted(userId: string, attendanceId?: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Atendimento Concluído',
      body: 'Seu atendimento foi concluído. Obrigado por utilizar nossos serviços!',
      route: attendanceId ? `attendance/${attendanceId}` : 'attendances',
      data: {
        type: 'attendance_completed',
        attendanceId: attendanceId || '',
      },
    });
  }

  /**
   * Notifica sobre mensagem administrativa
   * @param userIds IDs dos usuários destinatários
   * @param message Mensagem
   */
  async notifyAdminMessage(userIds: string[], message: string): Promise<number> {
    return this.sendToMultipleUsers(userIds, {
      title: 'Mensagem da Prefeitura',
      body: message,
      data: {
        type: 'admin_message',
      },
    });
  }
}
