import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/database/prisma.service';
import { RegisterPatientDto } from './dto/register-patient.dto';

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
            where: { type: 'PACIENTE', dt_delete: null },
            select: patientSelect,
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { idUser: id, dt_delete: null },
            select: {
                // basic user fields
                ...patientSelect,

                // forms assigned to this patient (so the UI can show which forms can be answered/edited)
                fromAssigned: {
                    where: { active: true, isScreening: true },
                    select: {
                        idForm: true,
                        title: true,
                        description: true,
                        isScreening: true,
                        createdAt: true,
                        updatedAt: true,
                        questions: {
                            orderBy: { order: 'asc' },
                            select: {
                                idQuestion: true,
                                text: true,
                                type: true,
                                required: true,
                                order: true,
                                options: {
                                    orderBy: { order: 'asc' },
                                    select: {
                                        idOption: true,
                                        text: true,
                                        value: true,
                                        order: true,
                                    },
                                },
                            },
                        },
                    },
                },

                // responses previously submitted by this patient
                formResponses: {
                    select: {
                        idResponse: true,
                        submittedAt: true,
                        form: {
                            select: {
                                idForm: true,
                                title: true,
                                isScreening: true,
                            },
                        },
                        answers: {
                            select: {
                                idAnswer: true,
                                value: true,
                                values: true,
                                question: {
                                    select: {
                                        idQuestion: true,
                                        text: true,
                                        type: true,
                                        options: {
                                            select: {
                                                idOption: true,
                                                text: true,
                                                value: true,
                                                order: true,
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
        if (!user) throw new NotFoundException('Paciente não encontrado');
        return user;
    }

    async create(data: RegisterPatientDto) {
        try {
            const createData = {
                ...(data as any),
                password: await this.authService.cryptPassword((data as any).password),
                type: 'PACIENTE',
            } as any;

            // busca pelo cpf e retorna falando se ja existe um usuario com esse cpf
            if (data.cpf) {
                const existingCpf = await this.prisma.user.findFirst({
                    where: { cpf: data.cpf },
                    select: { idUser: true },
                });
                if (existingCpf) {
                    // erro 422
                    throw new UnprocessableEntityException('Já existe um paciente com este CPF');
                }
            }

            const created = await this.prisma.user.create({
                data: createData,
                select: patientSelect,
            });
            return created;
        } catch (e) {

            if (e instanceof UnprocessableEntityException) {
                throw e;
            }
            // valida se não é um erro de unique constraint
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === 'P2002') {
                    const target = (e.meta && (e.meta.target as string[]).join(', ')) || 'campo único';
                    throw new BadRequestException(`Já existe um paciente com este(s) ${target}`);
                }
            }
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

    async remove(id: string, idUser: string) {
        try {
            await this.prisma.user.update({ where: { idUser: id }, data: { user_id_delete: idUser, dt_delete: new Date() } });
            return { success: true };
        } catch (e) {
            throw new BadRequestException('Não foi possível deletar paciente');
        }
    }
}
