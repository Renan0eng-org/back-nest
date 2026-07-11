import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreatePlantaoDto, UpdatePlantaoDto } from './dto/plantao.dto';

const doctorInclude = {
    doctor: { select: { idUser: true, name: true, avatar: true, especialidade: true } },
};

@Injectable()
export class EscalaService {
    constructor(private prisma: PrismaService) { }

    findAll(filter: { from?: string; to?: string; setor?: string; grupoId?: number }) {
        return this.prisma.plantao.findMany({
            where: {
                setor: filter.setor || undefined,
                grupoId: filter.grupoId ?? undefined,
                startsAt: filter.from ? { gte: new Date(filter.from) } : undefined,
                endsAt: filter.to ? { lte: new Date(filter.to) } : undefined,
            },
            include: doctorInclude,
            orderBy: { startsAt: 'asc' },
        });
    }

    async findOne(id: string) {
        const plantao = await this.prisma.plantao.findUnique({ where: { id }, include: doctorInclude });
        if (!plantao) throw new NotFoundException('Plantão não encontrado.');
        return plantao;
    }

    async create(dto: CreatePlantaoDto) {
        if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
            throw new BadRequestException('O fim do plantão deve ser depois do início.');
        }

        // Sem médico → plantão Aberto (mercado). Com médico → Agendado.
        if (dto.doctorId) {
            const doctor = await this.prisma.user.findFirst({ where: { idUser: dto.doctorId, type: 'MEDICO' } });
            if (!doctor) throw new BadRequestException('Médico não encontrado.');
            await this.assertNoOverlap(dto.doctorId, dto.startsAt, dto.endsAt);
        }

        return this.prisma.plantao.create({
            data: {
                doctorId: dto.doctorId ?? null,
                setor: dto.setor,
                startsAt: new Date(dto.startsAt),
                endsAt: new Date(dto.endsAt),
                grupoId: dto.grupoId ?? null,
                status: dto.doctorId ? 'Agendado' : 'Aberto',
            },
            include: doctorInclude,
        });
    }

    /** Um médico do grupo "pega" um plantão aberto. */
    async pegar(id: string, userId: string) {
        const medico = await this.prisma.user.findFirst({ where: { idUser: userId, type: 'MEDICO' } });
        if (!medico) throw new BadRequestException('Apenas médicos podem pegar um plantão.');

        const plantao = await this.findOne(id);
        if (plantao.status !== 'Aberto' || plantao.doctorId) {
            throw new BadRequestException('Este plantão não está mais disponível.');
        }

        await this.assertNoOverlap(userId, plantao.startsAt.toISOString(), plantao.endsAt.toISOString());

        return this.prisma.plantao.update({
            where: { id },
            data: { doctorId: userId, status: 'Agendado' },
            include: doctorInclude,
        });
    }

    /** Devolve um plantão para o mercado (fica Aberto de novo). */
    async liberar(id: string) {
        const plantao = await this.findOne(id);
        if (plantao.status === 'Concluido' || plantao.status === 'Cancelado') {
            throw new BadRequestException('Este plantão não pode ser liberado.');
        }
        return this.prisma.plantao.update({
            where: { id },
            data: { doctorId: null, status: 'Aberto', checkinAt: null, checkoutAt: null },
            include: doctorInclude,
        });
    }

    private async assertNoOverlap(doctorId: string, startsAt: string, endsAt: string) {
        const overlap = await this.prisma.plantao.findFirst({
            where: {
                doctorId,
                status: { notIn: ['Cancelado', 'Aberto'] },
                startsAt: { lt: new Date(endsAt) },
                endsAt: { gt: new Date(startsAt) },
            },
        });
        if (overlap) throw new BadRequestException('Este médico já tem um plantão nesse horário.');
    }

    async update(id: string, dto: UpdatePlantaoDto) {
        await this.findOne(id);
        return this.prisma.plantao.update({
            where: { id },
            data: {
                setor: dto.setor,
                startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
                endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
                grupoId: dto.grupoId,
            },
            include: doctorInclude,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.plantao.delete({ where: { id } });
        return { message: 'Plantão removido.' };
    }

    async checkin(id: string) {
        await this.findOne(id);
        return this.prisma.plantao.update({
            where: { id },
            data: { checkinAt: new Date(), status: 'EmAndamento' },
            include: doctorInclude,
        });
    }

    async checkout(id: string) {
        await this.findOne(id);
        return this.prisma.plantao.update({
            where: { id },
            data: { checkoutAt: new Date(), status: 'Concluido' },
            include: doctorInclude,
        });
    }
}
