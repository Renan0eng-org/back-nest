import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

const membroInclude = {
    membros: {
        include: {
            user: {
                select: {
                    idUser: true,
                    name: true,
                    email: true,
                    avatar: true,
                    type: true,
                    active: true,
                    nivel_acesso: { select: { idNivelAcesso: true, nome: true } },
                },
            },
        },
        orderBy: { joinedAt: 'asc' as const },
    },
};

@Injectable()
export class GruposService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.grupo.findMany({
            include: membroInclude,
            orderBy: { nome: 'asc' },
        });
    }

    async findOne(idGrupo: number) {
        const grupo = await this.prisma.grupo.findUnique({
            where: { idGrupo },
            include: membroInclude,
        });
        if (!grupo) throw new NotFoundException('Grupo não encontrado.');
        return grupo;
    }

    async create(data: { nome: string; descricao?: string }, createdById?: string) {
        return this.prisma.grupo.create({
            data: {
                nome: data.nome,
                descricao: data.descricao,
                createdById: createdById || null,
            },
            include: membroInclude,
        });
    }

    async update(idGrupo: number, data: { nome?: string; descricao?: string }) {
        await this.findOne(idGrupo);
        return this.prisma.grupo.update({
            where: { idGrupo },
            data,
            include: membroInclude,
        });
    }

    async remove(idGrupo: number) {
        const grupo = await this.findOne(idGrupo);
        if ((grupo as any).isDefault) {
            throw new BadRequestException('O grupo padrão do sistema não pode ser excluído.');
        }
        await this.prisma.grupo.delete({ where: { idGrupo } });
        return { message: 'Grupo excluído com sucesso.' };
    }

    async addMembros(idGrupo: number, userIds: string[]) {
        await this.findOne(idGrupo);
        if (!userIds?.length) throw new BadRequestException('Informe ao menos um usuário.');

        const users = await this.prisma.user.findMany({
            where: { idUser: { in: userIds }, dt_delete: null },
            select: { idUser: true },
        });
        const validIds = users.map(u => u.idUser);
        if (!validIds.length) throw new BadRequestException('Nenhum usuário válido encontrado.');

        await this.prisma.grupo_Membro.createMany({
            data: validIds.map(userId => ({ grupoId: idGrupo, userId })),
            skipDuplicates: true,
        });

        return this.findOne(idGrupo);
    }

    async removeMembro(idGrupo: number, userId: string) {
        await this.prisma.grupo_Membro.deleteMany({
            where: { grupoId: idGrupo, userId },
        });
        return this.findOne(idGrupo);
    }

    /**
     * Calcula o escopo de visibilidade de dados para um usuário.
     * Retorna null quando o usuário vê tudo (Admin / Admin Prefeitura),
     * ou os IDs de usuários visíveis + os IDs dos grupos aos quais pertence.
     */
    async getScopeForUser(user: any): Promise<{ visibleUserIds: string[]; groupIds: number[] } | null> {
        if (!user) return null; // sem informação do usuário → sem escopo (compatibilidade)

        const nivel = user.nivelAcessoId ?? user.nivel_acesso?.idNivelAcesso;
        if (user.type === 'ADMIN' || nivel === 2 || nivel === 3) return null;

        const memberships = await this.prisma.grupo_Membro.findMany({
            where: { userId: user.idUser },
            select: { grupoId: true },
        });
        const groupIds = memberships.map(m => m.grupoId);

        let visibleUserIds: string[];
        if (!groupIds.length) {
            visibleUserIds = [user.idUser];
        } else {
            const membros = await this.prisma.grupo_Membro.findMany({
                where: { grupoId: { in: groupIds } },
                select: { userId: true },
            });
            const ids = new Set<string>(membros.map(m => m.userId));
            ids.add(user.idUser);
            visibleUserIds = [...ids];
        }

        return { visibleUserIds, groupIds };
    }

    /**
     * Retorna os IDs de usuários cujos dados o usuário pode ver:
     * ele próprio + todos os membros dos grupos aos quais pertence.
     */
    async getVisibleUserIds(userId: string): Promise<string[]> {
        const memberships = await this.prisma.grupo_Membro.findMany({
            where: { userId },
            select: { grupoId: true },
        });

        if (!memberships.length) return [userId];

        const grupoIds = memberships.map(m => m.grupoId);
        const membros = await this.prisma.grupo_Membro.findMany({
            where: { grupoId: { in: grupoIds } },
            select: { userId: true },
        });

        const ids = new Set<string>(membros.map(m => m.userId));
        ids.add(userId);
        return [...ids];
    }
}
