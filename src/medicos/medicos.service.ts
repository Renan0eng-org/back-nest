import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/database/prisma.service';
import { CreateMedicoDto, UpdateMedicoDto } from './dto/medico.dto';

// Nível de acesso "Médico" (ver prisma/seed.ts)
const NIVEL_MEDICO = 5;

/** Remove o sufixo `_del_xxx` / `_delete_xxx` adicionado no soft delete. */
export function stripDelSuffix(value: string): string {
    return value.replace(/_del(?:ete)?_[a-z0-9]+$/i, '');
}

const medicoSelect = {
    idUser: true,
    name: true,
    email: true,
    cpf: true,
    phone: true,
    avatar: true,
    active: true,
    crm: true,
    especialidade: true,
    cargaHoraria: true,
    medicoStatus: true,
    nivelAcessoId: true,
    gruposMembro: { select: { grupo: { select: { idGrupo: true, nome: true } } } },
};

@Injectable()
export class MedicosService {
    constructor(private prisma: PrismaService, private auth: AuthService) { }

    findAll(deleted = false) {
        return this.prisma.user.findMany({
            where: { type: 'MEDICO', dt_delete: deleted ? { not: null } : null },
            select: medicoSelect,
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const medico = await this.prisma.user.findFirst({
            where: { idUser: id, type: 'MEDICO' },
            select: { ...medicoSelect, plantoes: { orderBy: { startsAt: 'desc' }, take: 20 } },
        });
        if (!medico) throw new NotFoundException('Médico não encontrado.');
        return medico;
    }

    /** Cria um usuário do tipo MEDICO (com login) e o vincula ao hospital. */
    async create(dto: CreateMedicoDto) {
        const existing = await this.prisma.user.findFirst({
            where: { OR: [{ email: dto.email }, { cpf: dto.cpf }] },
            select: { idUser: true },
        });
        if (existing) throw new BadRequestException('Já existe um usuário com este e-mail ou CPF.');

        const user = await this.auth.createUser({
            name: dto.name,
            email: dto.email,
            cpf: dto.cpf,
            password: dto.password,
            phone: dto.phone ?? null,
            type: 'MEDICO',
            active: true,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            nivel_acesso: { connect: { idNivelAcesso: NIVEL_MEDICO } },
            crm: dto.crm,
            especialidade: dto.especialidade,
            cargaHoraria: dto.cargaHoraria ?? null,
            medicoStatus: dto.status ?? 'Ativo',
        } as any);

        if (dto.grupoId) await this.linkGrupo(user.idUser, dto.grupoId);

        return this.findOne(user.idUser);
    }

    async update(id: string, dto: UpdateMedicoDto) {
        await this.findOne(id);
        await this.prisma.user.update({
            where: { idUser: id },
            data: {
                name: dto.name,
                phone: dto.phone,
                crm: dto.crm,
                especialidade: dto.especialidade,
                cargaHoraria: dto.cargaHoraria,
                medicoStatus: dto.status,
            },
        });
        if (dto.grupoId) await this.linkGrupo(id, dto.grupoId);
        return this.findOne(id);
    }

    /**
     * Soft delete: marca dt_delete, desativa e "libera" os campos únicos
     * (email/cpf) concatenando um sufixo com timestamp, para que um novo
     * cadastro com o mesmo e-mail/CPF não colida com o registro excluído.
     */
    async remove(id: string) {
        const medico = await this.findOne(id);
        const suffix = `_del_${Date.now().toString(36)}`;
        await this.prisma.user.update({
            where: { idUser: id },
            data: {
                medicoStatus: 'Inativo',
                active: false,
                dt_delete: new Date(),
                email: `${medico.email}${suffix}`,
                cpf: `${medico.cpf}${suffix}`,
            },
        });
        return { message: 'Médico removido.' };
    }

    /** Restaura um médico soft-deletado, devolvendo email/cpf originais. */
    async restore(id: string) {
        const medico = await this.prisma.user.findFirst({
            where: { idUser: id, type: 'MEDICO', dt_delete: { not: null } },
            select: { email: true, cpf: true },
        });
        if (!medico) throw new NotFoundException('Médico excluído não encontrado.');

        const email = stripDelSuffix(medico.email);
        const cpf = stripDelSuffix(medico.cpf);
        const clash = await this.prisma.user.findFirst({
            where: { dt_delete: null, OR: [{ email }, { cpf }] },
            select: { idUser: true },
        });
        if (clash) throw new BadRequestException('Já existe um usuário ativo com este e-mail ou CPF.');

        await this.prisma.user.update({
            where: { idUser: id },
            data: { dt_delete: null, active: true, medicoStatus: 'Ativo', email, cpf },
        });
        return this.findOne(id);
    }

    private async linkGrupo(userId: string, grupoId: number) {
        await this.prisma.grupo_Membro.createMany({
            data: [{ grupoId, userId }],
            skipDuplicates: true,
        });
    }
}
