import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from 'generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateAppointmentDto) {
    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date())
      throw new BadRequestException('scheduledAt inválido ou deve ser uma data no futuro');

    // normalize doctor/professional id (controller may supply professionalId)
    const doctorId = (dto as any).doctorId || (dto as any).professionalId;
    if (!doctorId) throw new BadRequestException('doctorId/professionalId é obrigatório');

    // checar doctor existe e é profissional
    const doctor = await this.prisma.user.findUnique({ where: { idUser: doctorId } });
    if (!doctor || (doctor as any).type !== 'USUARIO' && (doctor as any).type !== 'MEDICO') throw new NotFoundException('Profissional não encontrado');

    // patientId é obrigatório no schema atual; validar presença e existência
    if (!dto.patientId) throw new BadRequestException('patientId é obrigatório');

    const patient = await this.prisma.user.findUnique({ where: { idUser: dto.patientId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    // checagem de conflito simples (slot-based por igualdade)
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId: doctorId,
        scheduledAt,
        status: { in: [AppointmentStatus.Confirmado, AppointmentStatus.Pendente] },
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
          doctorId: dto.doctorId ?? null,
          professionalId: dto.professionalId ?? null,
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

  async findAll(query: any) {
    const where: any = {};

    if (query.patientId) where.patientId = query.patientId;

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { not: AppointmentStatus.Cancelado };
    }

    if (query.from || query.to) {
      where.scheduledAt = {};
      if (query.from) where.scheduledAt.gte = new Date(query.from);
      if (query.to) where.scheduledAt.lte = new Date(query.to);
      if (Object.keys(where.scheduledAt).length === 0) delete where.scheduledAt;
    }

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    } else {
      where.doctorId = { not: null };
    }

    try {
      return await this.prisma.appointment.findMany({
        where,
        include: { doctor: true, patient: true, response: true },
        orderBy: { scheduledAt: 'asc' },
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Erro ao buscar agendamentos');
    }
  }

  async findReferrals(query: any) {
    const where: any = {};

    if (query.patientId) where.patientId = query.patientId;

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { not: AppointmentStatus.Cancelado };
    }

    if (query.from || query.to) {
      where.scheduledAt = {};
      if (query.from) where.scheduledAt.gte = new Date(query.from);
      if (query.to) where.scheduledAt.lte = new Date(query.to);
      if (Object.keys(where.scheduledAt).length === 0) delete where.scheduledAt;
    }

    if (query.professionalId) {
      where.professionalId = query.professionalId;
    } else {
      where.professionalId = { not: null };
    }

    try {
      return await this.prisma.appointment.findMany({
        where,
        include: { professional: true, patient: true, response: true },
        orderBy: { scheduledAt: 'asc' },
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Erro ao buscar agendamentos');
    }
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
    return this.prisma.appointment.update({ where: { id }, data: { status: AppointmentStatus.Cancelado } });
  }

  async findProfessionalUsers() {
    const professionals = await this.prisma.user.findMany({
      where: {
        type: { in: ['MEDICO', 'USUARIO'] },
        active: true,
      },
      orderBy: { name: 'asc' },
    });
    return professionals;
  }
}
