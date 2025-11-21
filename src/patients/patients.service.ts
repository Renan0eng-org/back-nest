import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/database/prisma.service';

const patientSelect = Prisma.validator<Prisma.UserSelect>()({
    idUser: true,
    name: true,
    avatar: true,
    email: true,
    cpf: true,
    cep: true,
    phone: true,
    created: true,
    updated: true,
    active: true,
    nivelAcessoId: true,
    type: true,
    birthDate: true,
    sexo: true,
    unidadeSaude: true,
    medicamentos: true,
    exames: true,
    examesDetalhes: true,
    alergias: true,
    nivel_acesso: {
        select: {
            idNivelAcesso: true,
            nome: true,
        },
    },
});

@Injectable()
export class PatientsService {
    constructor(private prisma: PrismaService, private authService: AuthService) { }

    async findAll() {
        return this.prisma.user.findMany({
            where: { type: 'PACIENTE' },
            select: patientSelect,
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({ where: { idUser: id }, select: patientSelect });
        if (!user) throw new NotFoundException('Paciente não encontrado');
        return user;
    }

    async create(data: any) {
        try {
            const createData = {
                ...(data as any),
                password: await this.authService.cryptPassword((data as any).password),
                type: 'PACIENTE',
            } as any;

            const created = await this.prisma.user.create({
                data: createData,
                select: patientSelect,
            });
            return created;
        } catch (e) {
            throw new BadRequestException('Não foi possível criar paciente');
        }
    }

    async update(id: string, data: any) {
        try {
            const updated = await this.prisma.user.update({ where: { idUser: id }, data, select: patientSelect });
            return updated;
        } catch (e) {
            throw new BadRequestException('Não foi possível atualizar paciente');
        }
    }

    async remove(id: string) {
        // Soft delete: set active false
        try {
            await this.prisma.user.update({ where: { idUser: id }, data: { active: false } });
            return { success: true };
        } catch (e) {
            throw new BadRequestException('Não foi possível deletar paciente');
        }
    }
}
