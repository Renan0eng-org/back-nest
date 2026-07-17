import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExamRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationHelperService } from '../notifications/notification-helper.service';
import { CreateExamRequestDto } from './dto/create-exam-request.dto';
import { SubmitExamResultDto } from './dto/submit-exam-result.dto';

@Injectable()
export class ExamRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationHelperService,
  ) {}

  private readonly include = {
    patient: { select: { idUser: true, name: true } },
    requestedBy: { select: { idUser: true, name: true } },
    appointment: {
      select: { id: true, scheduledAt: true, modality: true, location: true },
    },
  } satisfies Prisma.ExamRequestInclude;

  /** Médico solicita 1..N exames. Retorna a lista criada. */
  async create(dto: CreateExamRequestDto, requesterId?: string) {
    const patient = await this.prisma.user.findUnique({
      where: { idUser: dto.patientId },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
      });
      if (!appt) throw new NotFoundException('Agendamento de retorno não encontrado');
    }
    if (dto.attendanceId) {
      const att = await this.prisma.attendance.findUnique({
        where: { id: dto.attendanceId },
      });
      if (!att) throw new NotFoundException('Atendimento não encontrado');
    }

    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.examRequest.create({
          data: {
            patientId: dto.patientId,
            attendanceId: dto.attendanceId ?? null,
            appointmentId: dto.appointmentId ?? null,
            requestedById: requesterId ?? null,
            name: item.name,
            instructions: item.instructions ?? null,
          },
          include: this.include,
        }),
      ),
    );

    // Notifica o paciente (best-effort). Sem conteúdo clínico no push.
    try {
      const count = created.length;
      await this.notifications.sendToUser(dto.patientId, {
        title: 'Novos exames solicitados',
        body:
          count === 1
            ? 'Seu médico solicitou 1 exame. Toque para enviar o resultado.'
            : `Seu médico solicitou ${count} exames. Toque para enviar os resultados.`,
        route: 'exams',
        data: { type: 'exam_requested', count: String(count) },
      });
    } catch {
      /* push é opcional */
    }

    return created;
  }

  /** Lista exames do próprio paciente (uso no app do paciente). */
  async findForPatient(
    patientId: string,
    filters?: { status?: ExamRequestStatus; appointmentId?: string },
  ) {
    return this.prisma.examRequest.findMany({
      where: {
        patientId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.appointmentId ? { appointmentId: filters.appointmentId } : {}),
      },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Listagem geral (uso pelo médico), filtrável. */
  async findAll(filters: {
    patientId?: string;
    appointmentId?: string;
    attendanceId?: string;
    status?: ExamRequestStatus;
  }) {
    return this.prisma.examRequest.findMany({
      where: {
        ...(filters.patientId ? { patientId: filters.patientId } : {}),
        ...(filters.appointmentId ? { appointmentId: filters.appointmentId } : {}),
        ...(filters.attendanceId ? { attendanceId: filters.attendanceId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const exam = await this.prisma.examRequest.findUnique({
      where: { id },
      include: this.include,
    });
    if (!exam) throw new NotFoundException('Solicitação de exame não encontrada');
    return exam;
  }

  /** Paciente envia o resultado (URL do arquivo). */
  async submitResult(id: string, patientId: string, dto: SubmitExamResultDto) {
    const exam = await this.prisma.examRequest.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Solicitação de exame não encontrada');
    if (exam.patientId !== patientId) {
      throw new ForbiddenException('Este exame não pertence a você');
    }
    if (exam.status === ExamRequestStatus.Cancelado) {
      throw new BadRequestException('Solicitação cancelada');
    }

    const updated = await this.prisma.examRequest.update({
      where: { id },
      data: {
        resultUrl: dto.resultUrl,
        resultFileName: dto.resultFileName ?? null,
        resultType: dto.resultType ?? null,
        resultAt: new Date(),
        status: ExamRequestStatus.Enviado,
      },
      include: this.include,
    });

    // Notifica o médico solicitante (best-effort).
    if (updated.requestedById) {
      try {
        await this.notifications.sendToUser(updated.requestedById, {
          title: 'Resultado de exame recebido',
          body: `${updated.patient.name} enviou o resultado de "${updated.name}".`,
          route: 'exams',
          data: { type: 'exam_result', examRequestId: updated.id },
        });
      } catch {
        /* push é opcional */
      }
    }

    return updated;
  }

  async updateStatus(id: string, status: ExamRequestStatus) {
    await this.findOne(id);
    return this.prisma.examRequest.update({
      where: { id },
      data: { status },
      include: this.include,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.examRequest.delete({ where: { id } });
  }
}
