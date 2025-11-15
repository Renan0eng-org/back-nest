import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from 'generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto) {
    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date())
      throw new BadRequestException('scheduledAt inválido ou deve ser uma data no futuro');

    // checar doctor existe e é profissional
    const doctor = await this.prisma.user.findUnique({ where: { idUser: dto.doctorId } });
    if (!doctor || (doctor as any).type !== 'USUARIO') throw new NotFoundException('Profissional não encontrado');

    // patientId é obrigatório no schema atual; validar presença e existência
    if (!dto.patientId) throw new BadRequestException('patientId é obrigatório');

    const patient = await this.prisma.user.findUnique({ where: { idUser: dto.patientId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    // checagem de conflito simples (slot-based por igualdade)
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        scheduledAt,
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
      },
    });
    if (conflict) throw new BadRequestException('Conflito de horário: profissional já possui agendamento nesse horário');

    // snapshot de pontuação (se houver) e checagem de existência da response
    let totalScoreAtTime: number | null = null;
    if (dto.responseId) {
      const resp = await this.prisma.response.findUnique({ where: { idResponse: dto.responseId } });
      if (!resp) throw new NotFoundException('Resposta não encontrada');
      if ((resp as any).totalScore !== undefined) totalScoreAtTime = (resp as any).totalScore;
    }

    // criar dentro de transação e incluir relações no retorno
    const created = await this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          doctorId: dto.doctorId,
          patientId: dto.patientId!,
          responseId: dto.responseId ?? null,
          scheduledAt,
          notes: dto.notes ?? null,
          totalScoreAtTime,
        },
        include: { doctor: true, patient: true, response: true },
      });

      return appt;
    });

    return created;
  }

  findAll(query: any) {
    const where: any = {};
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) where.scheduledAt = {};
    if (query.from) where.scheduledAt.gte = new Date(query.from);
    if (query.to) where.scheduledAt.lte = new Date(query.to);

    return this.prisma.appointment.findMany({
      where,
      include: { doctor: true, patient: true, response: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, include: { doctor: true, patient: true, response: true } });
    if (!appt) throw new NotFoundException('Agendamento não encontrado');
    return appt;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const data: any = {};
    if (dto.scheduledAt) {
      const scheduledAt = new Date(dto.scheduledAt);
      if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) throw new BadRequestException('scheduledAt inválido ou deve ser uma data no futuro');
      data.scheduledAt = scheduledAt;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.appointment.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.appointment.update({ where: { id }, data: { status: AppointmentStatus.CANCELLED } });
  }
}
