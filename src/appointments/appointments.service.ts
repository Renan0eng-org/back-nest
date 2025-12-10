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

  async findAll(query: any, opts?: { page?: number; pageSize?: number }) {
    const where: any = {};

    if (query?.patientId) where.patientId = query.patientId;

    // Filter by patient name using relationship
    if (query?.patientName) {
      where.patient = {
        name: { contains: query.patientName, mode: 'insensitive' },
      };
    }

    // Filter by doctor name using relationship
    if (query?.doctorName) {
      where.doctor = {
        name: { contains: query.doctorName, mode: 'insensitive' },
      };
    }

    // Filter by status - validate against enum values
    const validStatuses = ['Pendente', 'Confirmado', 'Cancelado', 'Completo'];
    if (query?.status) {
      if (validStatuses.includes(query.status)) {
        where.status = query.status;
      } else {
        throw new BadRequestException(`Status inválido. Valores aceitos: ${validStatuses.join(', ')}`);
      }
    } else {
      where.status = { not: AppointmentStatus.Cancelado };
    }

    // Filter by scheduled date range
    if (query?.scheduledFrom || query?.scheduledTo) {
      where.scheduledAt = {};
      if (query.scheduledFrom) {
        const fromDate = new Date(query.scheduledFrom);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          where.scheduledAt.gte = fromDate;
        }
      }
      if (query.scheduledTo) {
        const toDate = new Date(query.scheduledTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          where.scheduledAt.lte = toDate;
        }
      }
      if (Object.keys(where.scheduledAt).length === 0) delete where.scheduledAt;
    }

    // Filter by created date range
    if (query?.createdFrom || query?.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) {
        const fromDate = new Date(query.createdFrom);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          where.createdAt.gte = fromDate;
        }
      }
      if (query.createdTo) {
        const toDate = new Date(query.createdTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = toDate;
        }
      }
      if (Object.keys(where.createdAt).length === 0) delete where.createdAt;
    }

    // Existing doctor filter logic
    if (query?.doctorId) {
      where.doctorId = query.doctorId;
    } else if (!query?.doctorName) {
      // Only add this filter if not filtering by name
      where.NOT = { doctorId: null };
    }

    try {
      if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
        return await this.prisma.appointment.findMany({
          where,
          include: { doctor: true, patient: true, response: true },
          orderBy: { scheduledAt: 'asc' },
        });
      }

      const page = opts.page && opts.page > 0 ? opts.page : 1;
      const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

      const [total, data] = await Promise.all([
        this.prisma.appointment.count({ where }),
        this.prisma.appointment.findMany({
          where,
          include: { doctor: true, patient: true, response: true },
          orderBy: { scheduledAt: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return { total, page, pageSize, data };
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Erro ao buscar agendamentos');
    }
  }

  async findReferrals(query: any, opts?: { page?: number; pageSize?: number }) {
    const where: any = {};

    if (query.patientId) where.patientId = query.patientId;

    // Filter by patient name using relationship
    if (query.patientName) {
      where.patient = {
        name: { contains: query.patientName, mode: 'insensitive' },
      };
    }

    // Filter by professional name using relationship
    if (query.professionalName) {
      where.professional = {
        name: { contains: query.professionalName, mode: 'insensitive' },
      };
    }

    // Filter by status - validate against enum values
    const validStatuses = ['Pendente', 'Confirmado', 'Cancelado', 'Completo'];
    if (query.status) {
      if (validStatuses.includes(query.status)) {
        where.status = query.status;
      } else {
        throw new BadRequestException(`Status inválido. Valores aceitos: ${validStatuses.join(', ')}`);
      }
    } else {
      where.status = { not: AppointmentStatus.Cancelado };
    }

    // Filter by scheduled date range
    if (query.scheduledFrom || query.scheduledTo) {
      where.scheduledAt = {};
      if (query.scheduledFrom) {
        const fromDate = new Date(query.scheduledFrom);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          where.scheduledAt.gte = fromDate;
        }
      }
      if (query.scheduledTo) {
        const toDate = new Date(query.scheduledTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          where.scheduledAt.lte = toDate;
        }
      }
      if (Object.keys(where.scheduledAt).length === 0) delete where.scheduledAt;
    }

    // Filter by created date range
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) {
        const fromDate = new Date(query.createdFrom);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          where.createdAt.gte = fromDate;
        }
      }
      if (query.createdTo) {
        const toDate = new Date(query.createdTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = toDate;
        }
      }
      if (Object.keys(where.createdAt).length === 0) delete where.createdAt;
    }

    // Existing professional filter logic
    if (query?.professionalId) {
      where.professionalId = query.professionalId;
    } else if (!query.professionalName) {
      // Only add this filter if not filtering by name
      where.NOT = { professionalId: null };
    }

    try {
      if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
        return await this.prisma.appointment.findMany({
          where,
          include: { professional: true, patient: true, response: true },
          orderBy: { scheduledAt: 'asc' },
        });
      }

      const page = opts.page && opts.page > 0 ? opts.page : 1;
      const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

      const [total, data] = await Promise.all([
        this.prisma.appointment.count({ where }),
        this.prisma.appointment.findMany({
          where,
          include: { professional: true, patient: true, response: true },
          orderBy: { scheduledAt: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return { total, page, pageSize, data };
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

  async findProfessionalUsers(opts?: { page?: number; pageSize?: number }) {
    const where: any = { type: { in: ['MEDICO', 'USUARIO'] }, active: true };

    if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
      return this.prisma.user.findMany({ where, orderBy: { name: 'asc' } });
    }

    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);

    return { total, page, pageSize, data };
  }
}
