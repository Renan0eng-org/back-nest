import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QueueStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { CallTicketDto, CreateTicketDto } from './dto/fila.dto';

const ticketInclude = {
    patient: { select: { idUser: true, name: true } },
    doctor: { select: { idUser: true, name: true } },
};

// Prefixo da senha por prioridade
const PREFIX: Record<string, string> = { Normal: 'N', Preferencial: 'P', Urgencia: 'A' };

@Injectable()
export class FilaService {
    constructor(private prisma: PrismaService) { }

    findAll(status?: QueueStatus, grupoId?: number) {
        return this.prisma.queueTicket.findMany({
            where: {
                status: status || undefined,
                grupoId: grupoId ?? undefined,
                issuedAt: { gte: startOfToday() },
            },
            include: ticketInclude,
            orderBy: [{ priority: 'desc' }, { issuedAt: 'asc' }],
        });
    }

    async stats(grupoId?: number) {
        const where = { grupoId: grupoId ?? undefined, issuedAt: { gte: startOfToday() } };
        const [aguardando, chamado, emAtendimento, concluidos] = await Promise.all([
            this.prisma.queueTicket.count({ where: { ...where, status: 'Aguardando' } }),
            this.prisma.queueTicket.count({ where: { ...where, status: 'Chamado' } }),
            this.prisma.queueTicket.count({ where: { ...where, status: 'EmAtendimento' } }),
            this.prisma.queueTicket.findMany({
                where: { ...where, status: 'Concluido', calledAt: { not: null } },
                select: { issuedAt: true, calledAt: true },
            }),
        ]);

        // Espera média (emissão → chamada), em segundos
        let avgWaitSeconds = 0;
        if (concluidos.length) {
            const total = concluidos.reduce((acc, t) => acc + ((t.calledAt!.getTime() - t.issuedAt.getTime()) / 1000), 0);
            avgWaitSeconds = Math.round(total / concluidos.length);
        }

        return { aguardando, chamado, emAtendimento, concluidos: concluidos.length, avgWaitSeconds };
    }

    async create(dto: CreateTicketDto) {
        if (!dto.patientId && !dto.patientName) {
            throw new BadRequestException('Informe o paciente (cadastro ou nome).');
        }
        const priority = dto.priority ?? 'Normal';
        const code = await this.nextCode(priority);

        return this.prisma.queueTicket.create({
            data: {
                code,
                setor: dto.setor,
                priority,
                patientId: dto.patientId ?? null,
                patientName: dto.patientName ?? null,
                grupoId: dto.grupoId ?? null,
            },
            include: ticketInclude,
        });
    }

    async call(id: string, dto: CallTicketDto) {
        const ticket = await this.get(id);
        if (ticket.status !== 'Aguardando') throw new BadRequestException('Esta senha não está aguardando.');
        return this.prisma.queueTicket.update({
            where: { id },
            data: { status: 'Chamado', calledAt: new Date(), doctorId: dto.doctorId ?? null },
            include: ticketInclude,
        });
    }

    async confirm(id: string) {
        const ticket = await this.get(id);
        if (ticket.status !== 'Chamado') throw new BadRequestException('Só é possível confirmar uma senha chamada.');
        return this.prisma.queueTicket.update({
            where: { id },
            data: { status: 'EmAtendimento', confirmedAt: new Date() },
            include: ticketInclude,
        });
    }

    async finish(id: string) {
        await this.get(id);
        return this.prisma.queueTicket.update({
            where: { id },
            data: { status: 'Concluido', closedAt: new Date() },
            include: ticketInclude,
        });
    }

    async cancel(id: string) {
        await this.get(id);
        return this.prisma.queueTicket.update({
            where: { id },
            data: { status: 'Cancelado', closedAt: new Date() },
            include: ticketInclude,
        });
    }

    async miss(id: string) {
        await this.get(id);
        return this.prisma.queueTicket.update({
            where: { id },
            data: { status: 'Faltou', closedAt: new Date() },
            include: ticketInclude,
        });
    }

    private async get(id: string) {
        const ticket = await this.prisma.queueTicket.findUnique({ where: { id } });
        if (!ticket) throw new NotFoundException('Senha não encontrada.');
        return ticket;
    }

    private async nextCode(priority: string): Promise<string> {
        const prefix = PREFIX[priority] ?? 'N';
        const count = await this.prisma.queueTicket.count({
            where: { priority: priority as any, issuedAt: { gte: startOfToday() } },
        });
        return `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }
}

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
