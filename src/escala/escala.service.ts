import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreatePlantaoDto, UpdatePlantaoDto } from './dto/plantao.dto';

const doctorInclude = {
    doctor: { select: { idUser: true, name: true, avatar: true, especialidade: true } },
};

@Injectable()
export class EscalaService {
    constructor(private prisma: PrismaService) { }

    /** Usuário cujo nível possui o menu escala-admin. */
    private isEscalaAdmin(user: any): boolean {
        return (user?.nivel_acesso?.menus || []).some((m: any) => m?.slug === 'escala-admin');
    }

    /** Check-in, check-out e devolução só pelo próprio médico do plantão ou por um admin da escala. */
    private assertCanManageShift(plantao: { doctorId: string | null }, user: any) {
        if (this.isEscalaAdmin(user)) return;
        if (plantao.doctorId && plantao.doctorId === user?.idUser) return;
        throw new ForbiddenException('Apenas o médico do plantão ou o Escala de Plantão Admin podem realizar esta ação.');
    }

    findAll(filter: { from?: string; to?: string; setor?: string; grupoId?: number; deleted?: boolean }) {
        return this.prisma.plantao.findMany({
            where: {
                deletedAt: filter.deleted ? { not: null } : null,
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
        const plantao = await this.prisma.plantao.findFirst({ where: { id, deletedAt: null }, include: doctorInclude });
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
    async liberar(id: string, user?: any) {
        const plantao = await this.findOne(id);
        this.assertCanManageShift(plantao, user);
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

    /** Soft delete. */
    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.plantao.update({ where: { id }, data: { deletedAt: new Date() } });
        return { message: 'Plantão removido.' };
    }

    async restore(id: string) {
        const plantao = await this.prisma.plantao.findFirst({ where: { id, deletedAt: { not: null } } });
        if (!plantao) throw new NotFoundException('Plantão excluído não encontrado.');
        return this.prisma.plantao.update({ where: { id }, data: { deletedAt: null }, include: doctorInclude });
    }

    async checkin(id: string, user?: any) {
        const plantao = await this.findOne(id);
        this.assertCanManageShift(plantao, user);
        return this.prisma.plantao.update({
            where: { id },
            data: { checkinAt: new Date(), status: 'EmAndamento' },
            include: doctorInclude,
        });
    }

    async checkout(id: string, user?: any) {
        const plantao = await this.findOne(id);
        this.assertCanManageShift(plantao, user);
        return this.prisma.plantao.update({
            where: { id },
            data: { checkoutAt: new Date(), status: 'Concluido' },
            include: doctorInclude,
        });
    }
}
