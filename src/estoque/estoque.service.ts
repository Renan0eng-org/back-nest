import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateSupplyDto, MovimentacaoDto, UpdateSupplyDto } from './dto/estoque.dto';

/** Deriva o status de estoque a partir do saldo e do mínimo. */
function stockStatus(balance: number, minStock: number): 'OK' | 'Baixo' | 'Critico' {
    if (balance <= 0) return 'Critico';
    if (balance <= minStock) return 'Baixo';
    if (balance <= minStock * 1.5) return 'Baixo';
    return 'OK';
}

@Injectable()
export class EstoqueService {
    constructor(private prisma: PrismaService) { }

    async findAll(grupoId?: number) {
        const supplies = await this.prisma.supply.findMany({
            where: grupoId ? { grupoId } : undefined,
            orderBy: { name: 'asc' },
        });
        return supplies.map((s) => ({ ...s, status: stockStatus(s.balance, s.minStock) }));
    }

    async findOne(id: string) {
        const supply = await this.prisma.supply.findUnique({
            where: { id },
            include: { movements: { orderBy: { createdAt: 'desc' }, take: 50 } },
        });
        if (!supply) throw new NotFoundException('Insumo não encontrado.');
        return { ...supply, status: stockStatus(supply.balance, supply.minStock) };
    }

    create(dto: CreateSupplyDto) {
        return this.prisma.supply.create({
            data: {
                name: dto.name,
                unit: dto.unit,
                balance: dto.balance ?? 0,
                minStock: dto.minStock ?? 0,
                lot: dto.lot ?? null,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                grupoId: dto.grupoId ?? null,
            },
        });
    }

    async update(id: string, dto: UpdateSupplyDto) {
        await this.findOne(id);
        return this.prisma.supply.update({
            where: { id },
            data: {
                name: dto.name,
                unit: dto.unit,
                minStock: dto.minStock,
                lot: dto.lot,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.supply.delete({ where: { id } });
        return { message: 'Insumo removido.' };
    }

    /** Entrada/saída de estoque com ajuste de saldo transacional. */
    async movimentar(id: string, dto: MovimentacaoDto, userId?: string) {
        const supply = await this.prisma.supply.findUnique({ where: { id } });
        if (!supply) throw new NotFoundException('Insumo não encontrado.');

        const delta = dto.type === 'Entrada' ? dto.quantity : -dto.quantity;
        const newBalance = supply.balance + delta;
        if (newBalance < 0) {
            throw new BadRequestException(`Saldo insuficiente. Disponível: ${supply.balance} ${supply.unit}.`);
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.supplyMovement.create({
                data: {
                    supplyId: id,
                    type: dto.type,
                    quantity: dto.quantity,
                    reason: dto.reason ?? null,
                    attendanceId: dto.attendanceId ?? null,
                    userId: userId ?? null,
                },
            });
            return tx.supply.update({ where: { id }, data: { balance: newBalance } });
        });
    }

    async movimentacoes(id: string) {
        await this.findOne(id);
        return this.prisma.supplyMovement.findMany({
            where: { supplyId: id },
            orderBy: { createdAt: 'desc' },
        });
    }
}
