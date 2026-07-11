import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/database/prisma.service';
import { CreateMedicoDto, UpdateMedicoDto } from './dto/medico.dto';

// Nível de acesso "Médico" (ver prisma/seed.ts)
const NIVEL_MEDICO = 5;

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

    findAll() {
        return this.prisma.user.findMany({
            where: { type: 'MEDICO', dt_delete: null },
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

    /** "Remover" = desativar o médico (mantém o usuário e o histórico). */
    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.user.update({
            where: { idUser: id },
            data: { medicoStatus: 'Inativo', active: false },
        });
        return { message: 'Médico desativado.' };
    }

    private async linkGrupo(userId: string, grupoId: number) {
        await this.prisma.grupo_Membro.createMany({
            data: [{ grupoId, userId }],
            skipDuplicates: true,
        });
    }
}
