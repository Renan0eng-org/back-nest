import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, Prisma } from 'generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateFromAppointmentDto } from './dto/create-from-appointment.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAttendanceDto, userId?: string) {
    const attendanceDate = new Date(dto.attendanceDate);
    if (isNaN(attendanceDate.getTime())) {
      throw new BadRequestException('Data de atendimento inválida');
    }

    // Validar se o paciente existe
    const patient = await this.prisma.user.findUnique({
      where: { idUser: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    // Validar se o profissional existe
    const professional = await this.prisma.user.findUnique({
      where: { idUser: dto.professionalId },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    // Se houver appointmentId, validar se existe
    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
      });
      if (!appointment) {
        throw new NotFoundException('Agendamento não encontrado');
      }
    }

    const data: Prisma.AttendanceCreateInput = {
      patient: { connect: { idUser: dto.patientId } },
      professional: { connect: { idUser: dto.professionalId } },
      attendanceDate,
      chiefComplaint: dto.chiefComplaint,
      presentingIllness: dto.presentingIllness,
      medicalHistory: dto.medicalHistory,
      physicalExamination: dto.physicalExamination,
      diagnosis: dto.diagnosis,
      treatment: dto.treatment,
      bloodPressure: dto.bloodPressure,
      heartRate: dto.heartRate,
      temperature: dto.temperature ? new Prisma.Decimal(dto.temperature) : undefined,
      respiratoryRate: dto.respiratoryRate,
    };

    if (dto.appointmentId) {
      data.appointment = { connect: { id: dto.appointmentId } };
    }

    if (userId) {
      data.creator = { connect: { idUser: userId } };
    }

    return this.prisma.attendance.create({
      data,
      include: {
        patient: true,
        professional: true,
        appointment: true,
        prescriptions: true,
        attachments: true,
      },
    });
  }

  async createFromAppointment(appointmentId: string, dto: CreateFromAppointmentDto, userId?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true, professional: true },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    // Usar doctor ou professional do appointment
    const professionalId = appointment.doctorId || appointment.professionalId;
    if (!professionalId) {
      throw new BadRequestException('Agendamento não possui profissional associado');
    }

    const data: Prisma.AttendanceCreateInput = {
      appointment: { connect: { id: appointmentId } },
      patient: { connect: { idUser: appointment.patientId } },
      professional: { connect: { idUser: professionalId } },
      attendanceDate: appointment.scheduledAt,
      chiefComplaint: dto.chiefComplaint,
      presentingIllness: dto.presentingIllness,
      medicalHistory: dto.medicalHistory,
      physicalExamination: dto.physicalExamination,
      diagnosis: dto.diagnosis,
      treatment: dto.treatment,
      bloodPressure: dto.bloodPressure,
      heartRate: dto.heartRate,
      temperature: dto.temperature ? new Prisma.Decimal(dto.temperature) : undefined,
      respiratoryRate: dto.respiratoryRate,
    };

    if (userId) {
      data.creator = { connect: { idUser: userId } };
    }

    return this.prisma.attendance.create({
      data,
      include: {
        patient: true,
        professional: true,
        appointment: true,
        prescriptions: true,
        attachments: true,
      },
    });
  }

  async findAll(query: any, opts?: { page?: number; pageSize?: number }) {
    const where: any = {};

    // Filter by patient name
    if (query?.patientName) {
      where.patient = {
        name: { contains: query.patientName, mode: 'insensitive' },
      };
    }

    // Filter by professional name
    if (query?.professionalName) {
      where.professional = {
        name: { contains: query.professionalName, mode: 'insensitive' },
      };
    }

    // Filter by status
    const validStatuses = ['EmAndamento', 'Concluido', 'Cancelado'];
    if (query?.status) {
      if (validStatuses.includes(query.status)) {
        where.status = query.status;
      } else {
        throw new BadRequestException(`Status inválido. Valores aceitos: ${validStatuses.join(', ')}`);
      }
    }

    // Filter by attendance date range
    if (query?.attendanceFrom || query?.attendanceTo) {
      where.attendanceDate = {};
      if (query.attendanceFrom) {
        const fromDate = new Date(query.attendanceFrom);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          where.attendanceDate.gte = fromDate;
        }
      }
      if (query.attendanceTo) {
        const toDate = new Date(query.attendanceTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          where.attendanceDate.lte = toDate;
        }
      }
      if (Object.keys(where.attendanceDate).length === 0) delete where.attendanceDate;
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

    // Filter by appointmentId
    if (query?.appointmentId) {
      where.appointmentId = query.appointmentId;
    }

    try {
      if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
        return await this.prisma.attendance.findMany({
          where,
          include: {
            patient: true,
            professional: true,
            appointment: true,
            prescriptions: true,
          },
          orderBy: { attendanceDate: 'desc' },
        });
      }

      const page = opts.page && opts.page > 0 ? opts.page : 1;
      const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 10;

      const [total, data] = await Promise.all([
        this.prisma.attendance.count({ where }),
        this.prisma.attendance.findMany({
          where,
          include: {
            patient: true,
            professional: true,
            appointment: true,
            prescriptions: true,
          },
          orderBy: { attendanceDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return { total, page, pageSize, data };
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Erro ao buscar atendimentos');
    }
  }

  async findOne(id: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        patient: true,
        professional: true,
        appointment: true,
        prescriptions: true,
        attachments: true,
        creator: true,
        assignedForms: {
          include: {
            questions: {
              include: {
                options: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        responses: {
          include: {
            response: {
              include: {
                form: true,
                user: true,
                answers: {
                  include: {
                    question: {
                      include: {
                        options: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return attendance;
  }

  async update(id: string, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    const data: any = {};

    if (dto.attendanceDate) {
      const attendanceDate = new Date(dto.attendanceDate);
      if (isNaN(attendanceDate.getTime())) {
        throw new BadRequestException('Data de atendimento inválida');
      }
      data.attendanceDate = attendanceDate;
    }

    if (dto.chiefComplaint !== undefined) data.chiefComplaint = dto.chiefComplaint;
    if (dto.presentingIllness !== undefined) data.presentingIllness = dto.presentingIllness;
    if (dto.medicalHistory !== undefined) data.medicalHistory = dto.medicalHistory;
    if (dto.physicalExamination !== undefined) data.physicalExamination = dto.physicalExamination;
    if (dto.diagnosis !== undefined) data.diagnosis = dto.diagnosis;
    if (dto.treatment !== undefined) data.treatment = dto.treatment;
    if (dto.bloodPressure !== undefined) data.bloodPressure = dto.bloodPressure;
    if (dto.heartRate !== undefined) data.heartRate = dto.heartRate;
    if (dto.temperature !== undefined) data.temperature = new Prisma.Decimal(dto.temperature);
    if (dto.respiratoryRate !== undefined) data.respiratoryRate = dto.respiratoryRate;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.attendance.update({
      where: { id },
      data,
      include: {
        patient: true,
        professional: true,
        appointment: true,
        prescriptions: true,
        attachments: true,
      },
    });
  }

  async updateStatus(id: string, status: AttendanceStatus) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return this.prisma.attendance.update({
      where: { id },
      data: { status },
      include: {
        patient: true,
        professional: true,
        appointment: true,
        prescriptions: true,
      },
    });
  }

  async remove(id: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return this.prisma.attendance.delete({ where: { id } });
  }

  // ==================== PRESCRIPTIONS ====================

  async createPrescription(attendanceId: string, dto: CreatePrescriptionDto) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return this.prisma.attendancePrescription.create({
      data: {
        attendanceId,
        medication: dto.medication,
        dosage: dto.dosage,
        frequency: dto.frequency,
        duration: dto.duration,
        instructions: dto.instructions,
      },
    });
  }

  async updatePrescription(attendanceId: string, prescriptionId: string, dto: UpdatePrescriptionDto) {
    const prescription = await this.prisma.attendancePrescription.findFirst({
      where: { id: prescriptionId, attendanceId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescrição não encontrada');
    }

    const data: any = {};
    if (dto.medication !== undefined) data.medication = dto.medication;
    if (dto.dosage !== undefined) data.dosage = dto.dosage;
    if (dto.frequency !== undefined) data.frequency = dto.frequency;
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;

    return this.prisma.attendancePrescription.update({
      where: { id: prescriptionId },
      data,
    });
  }

  async removePrescription(attendanceId: string, prescriptionId: string) {
    const prescription = await this.prisma.attendancePrescription.findFirst({
      where: { id: prescriptionId, attendanceId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescrição não encontrada');
    }

    return this.prisma.attendancePrescription.delete({
      where: { id: prescriptionId },
    });
  }

  // ==================== ATTACHMENTS ====================

  async createAttachment(attendanceId: string, fileName: string, fileUrl: string, fileType?: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return this.prisma.attendanceAttachment.create({
      data: {
        attendanceId,
        fileName,
        fileUrl,
        fileType,
      },
    });
  }

  async removeAttachment(attendanceId: string, attachmentId: string) {
    const attachment = await this.prisma.attendanceAttachment.findFirst({
      where: { id: attachmentId, attendanceId },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    return this.prisma.attendanceAttachment.delete({
      where: { id: attachmentId },
    });
  }

  // ==================== FORMS & RESPONSES ====================

  async assignForms(attendanceId: string, formIds: string[]) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { assignedForms: true },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Validar se os formulários existem
    const forms = await this.prisma.form.findMany({
      where: { idForm: { in: formIds }, active: true },
    });

    if (forms.length !== formIds.length) {
      throw new NotFoundException('Um ou mais formulários não foram encontrados');
    }

    // Conectar os formulários ao atendimento
    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        assignedForms: {
          connect: formIds.map((id) => ({ idForm: id })),
        },
      },
      include: {
        assignedForms: true,
        patient: true,
        professional: true,
      },
    });
  }

  async unassignForms(attendanceId: string, formIds: string[]) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        assignedForms: {
          disconnect: formIds.map((id) => ({ idForm: id })),
        },
      },
      include: {
        assignedForms: true,
      },
    });
  }

  async getAssignedForms(attendanceId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        assignedForms: {
          include: {
            questions: {
              include: {
                options: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return attendance.assignedForms;
  }

  async linkResponse(attendanceId: string, responseId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    const response = await this.prisma.response.findUnique({
      where: { idResponse: responseId },
    });

    if (!response) {
      throw new NotFoundException('Resposta não encontrada');
    }

    // Verificar se a resposta já está vinculada a este atendimento
    const existingLink = await this.prisma.attendanceResponse.findUnique({
      where: {
        attendanceId_responseId: {
          attendanceId,
          responseId,
        },
      },
    });

    if (existingLink) {
      throw new BadRequestException('Resposta já está vinculada a este atendimento');
    }

    return this.prisma.attendanceResponse.create({
      data: {
        attendanceId,
        responseId,
      },
      include: {
        response: {
          include: {
            form: true,
            answers: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async unlinkResponse(attendanceId: string, responseId: string) {
    const link = await this.prisma.attendanceResponse.findUnique({
      where: {
        attendanceId_responseId: {
          attendanceId,
          responseId,
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    return this.prisma.attendanceResponse.delete({
      where: { id: link.id },
    });
  }

  async getResponses(attendanceId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        responses: {
          include: {
            response: {
              include: {
                form: true,
                user: true,
                answers: {
                  include: {
                    question: {
                      include: {
                        options: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return attendance.responses.map((ar) => ar.response);
  }

  async getAvailableForms(isScreening?: boolean) {
    const where: any = { active: true };
    if (isScreening !== undefined) {
      where.isScreening = isScreening;
    }

    return this.prisma.form.findMany({
      where,
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { title: 'asc' },
    });
  }
}
