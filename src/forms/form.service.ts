import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { SaveFormDto } from './dto/save-form.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

@Injectable()
export class FormService {
    constructor(private prisma: PrismaService) { }

    async getAssignedUsers(idForm: string) {
        const form = await this.prisma.form.findUnique({
            where: { idForm },
            include: {
                assignedUsers: {
                    where: { type: 'PACIENTE' },
                    select: {
                        idUser: true,
                        name: true,
                        email: true,
                        active: true,
                    },
                },
            },
        });

        if (!form) throw new NotFoundException('Formulário não encontrado');

        return form.assignedUsers;
    }

    async assignUsers(idForm: string, userIds: string[]) {
        await this.prisma.form.update({
            where: {
                idForm,
            },
            data: {
                assignedUsers: {
                    set: [],
                },
            },
        });

        if (userIds.length > 0) {
            await this.prisma.form.update({
                where: { idForm },
                data: {
                    assignedUsers: {
                        connect: userIds.map((idUser) => ({ idUser })),
                    },
                },
            });
        }

        return { success: true };
    }

    async unassignUsers(idForm: string, userIds: string[]) {
        await this.prisma.form.update({
            where: { idForm },
            data: {
                assignedUsers: {
                    disconnect: userIds.map((idUser) => ({ idUser })),
                },
            },
        });

        return { success: true };
    }

    async findAll(opts?: { page?: number; pageSize?: number }) {
        const where: any = { active: true };

        if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
            const formsWithCount = await this.prisma.form.findMany({
                where,
                select: {
                    idForm: true,
                    title: true,
                    description: true,
                    updatedAt: true,
                    isScreening: true,
                    _count: { select: { responses: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });

            return formsWithCount.map(form => ({
                idForm: form.idForm,
                title: form.title,
                description: form.description,
                updatedAt: form.updatedAt,
                isScreening: form.isScreening,
                responses: form._count.responses,
            }));
        }

        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

        const [total, rows] = await Promise.all([
            this.prisma.form.count({ where }),
            this.prisma.form.findMany({
                where,
                select: {
                    idForm: true,
                    title: true,
                    description: true,
                    updatedAt: true,
                    isScreening: true,
                    _count: { select: { responses: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        const data = rows.map(form => ({
            idForm: form.idForm,
            title: form.title,
            description: form.description,
            updatedAt: form.updatedAt,
            isScreening: form.isScreening,
            responses: form._count.responses,
        }));

        return { total, page, pageSize, data };
    }

    async findScreenings(opts?: { page?: number; pageSize?: number }) {
        const where: any = { active: true, isScreening: true };

        if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
            const formsWithCount = await this.prisma.form.findMany({
                where,
                select: {
                    idForm: true,
                    title: true,
                    description: true,
                    updatedAt: true,
                    _count: { select: { responses: true } },
                    questions: { select: { formId: true, idQuestion: true, text: true, type: true, required: true, order: true, options: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });

            return formsWithCount.map(form => ({
                idForm: form.idForm,
                title: form.title,
                description: form.description,
                updatedAt: form.updatedAt,
                responses: form._count.responses,
                questions: form.questions,
            }));
        }

        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

        const [total, rows] = await Promise.all([
            this.prisma.form.count({ where }),
            this.prisma.form.findMany({
                where,
                select: {
                    idForm: true,
                    title: true,
                    description: true,
                    updatedAt: true,
                    _count: { select: { responses: true } },
                    questions: { select: { formId: true, idQuestion: true, text: true, type: true, required: true, order: true, options: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        const data = rows.map(form => ({
            idForm: form.idForm,
            title: form.title,
            description: form.description,
            updatedAt: form.updatedAt,
            responses: form._count.responses,
            questions: form.questions,
        }));

        return { total, page, pageSize, data };
    }

    async findOne(idForm: string) {
        const form = await this.prisma.form.findUnique({
            where: { idForm, active: true },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                    include: {
                        options: {
                            orderBy: { order: 'asc' },
                        },
                    },
                },
            },
        });

        if (!form) {
            throw new NotFoundException(`Formulário com ID ${idForm} não encontrado.`);
        }
        return form;
    }

    async create(dto: SaveFormDto) {
        const { title, description, questions } = dto;

        return this.prisma.form.create({
            data: {
                title,
                description,
                questions: {
                    create: questions.map((q, qIndex) => ({
                        text: q.text,
                        type: q.type,
                        required: q.required,
                        order: qIndex, // Salva a ordem
                        options: {
                            create: q.options.map((opt, oIndex) => ({
                                text: opt.text,
                                order: oIndex,
                                value: opt.value,
                            })),
                        },
                    })),
                },
            },
        });
    }

    async update(formId: string, dto: SaveFormDto) {
        const { title, description, questions } = dto;

        return this.prisma.$transaction(async (tx) => {
            await tx.form.update({
                where: { idForm: formId },
                data: { title, description },
            });

            const oldQuestions = await tx.question.findMany({
                where: { formId: formId },
            });

            for (const oldQuestion of oldQuestions) {
                const exists = questions.find(q => q.idQuestion === oldQuestion.idQuestion);
                if (!exists) {
                    await tx.option.deleteMany({
                        where: { questionId: oldQuestion.idQuestion },
                    });
                    await tx.question.delete({
                        where: { idQuestion: oldQuestion.idQuestion },
                    });
                }
            }

            for (const question of questions) {
                const oldQuestion = oldQuestions.find(q => q.idQuestion === question.idQuestion);
                if (oldQuestion) {
                    await tx.question.update({
                        where: { idQuestion: oldQuestion.idQuestion },
                        data: {
                            text: question.text,
                            type: question.type,
                            required: question.required,
                        },
                    });

                    const oldOptions = await tx.option.findMany({
                        where: { questionId: oldQuestion.idQuestion },
                    });
                    for (const option of question.options) {
                        const oldOption = oldOptions.find(o => o.idOption === option.idOption);
                        if (oldOption) {
                            await tx.option.update({
                                where: { idOption: oldOption.idOption },
                                data: {
                                    text: option.text,
                                    value: option.value,
                                },
                            });
                        } else {
                            await tx.option.create({
                                data: {
                                    text: option.text,
                                    order: question.options.indexOf(option),
                                    value: option.value,
                                    questionId: oldQuestion.idQuestion,
                                },
                            });
                        }
                    }

                } else {
                    const newQuestion = await tx.question.create({
                        data: {
                            text: question.text,
                            type: question.type,
                            required: question.required,
                            order: questions.indexOf(question),
                            formId: formId,
                        },
                    });
                    await tx.option.createMany({
                        data: question.options.map((opt, oIndex) => ({
                            text: opt.text,
                            order: oIndex,
                            value: opt.value,
                            questionId: newQuestion.idQuestion,
                        })),
                    });
                }
            }

            const updatedForm = await tx.form.findUnique({
                where: { idForm: formId, active: true },
                include: {
                    questions: {
                        orderBy: { order: 'asc' },
                        include: {
                            options: {
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
            });

            return updatedForm;
        });
    }

    async delete(formId: string) {
        await this.prisma.form.update({
            where: { idForm: formId },
            data: {
                active: false
            },
        });
    }

    async setScreening(idForm: string, value: boolean) {
        const form = await this.prisma.form.findUnique({ where: { idForm, active: true } });
        if (!form) throw new NotFoundException('Formulário não encontrado');

        const updated = await this.prisma.form.update({
            where: { idForm },
            data: { isScreening: value },
        });

        return { idForm: updated.idForm, isScreening: updated.isScreening };
    }

    async toggleScreening(idForm: string) {
        const form = await this.prisma.form.findUnique({ where: { idForm, active: true }, select: { isScreening: true } });
        if (!form) throw new NotFoundException('Formulário não encontrado');

        const updated = await this.prisma.form.update({
            where: { idForm },
            data: { isScreening: !form.isScreening },
        });

        return { idForm: updated.idForm, isScreening: updated.isScreening };
    }

    async submitResponse(
        formId: string,
        submitResponseDto: SubmitResponseDto,
        userId: string,
    ) {
        const { answers } = submitResponseDto;

        return this.prisma.$transaction(async (tx) => {
            const newResponse = await tx.response.create({
                data: {
                    form: { connect: { idForm: formId } },
                    user: { connect: { idUser: userId } },
                },
            });

            const answersToCreate = answers.map((answer) => ({
                responseId: newResponse.idResponse,
                questionId: answer.questionId,
                value: answer.value,
                values: answer.values,
            }));

            await tx.answer.createMany({
                data: answersToCreate,
            });

            return newResponse;
        });
    }

    async updateResponse(
        formId: string,
        submitResponseDto: SubmitResponseDto,
        userId: string,
        responseId: string,
    ) {
        const { answers } = submitResponseDto;

        return this.prisma.$transaction(async (tx) => {
            const existingResponse = await tx.response.findFirst({
                where: {
                    formId,
                    userId,
                    idResponse: responseId,
                },
            });

            if (!existingResponse) {
                throw new Error('Response not found');
            }

            await tx.answer.deleteMany({
                where: { responseId: responseId },
            });

            const answersToCreate = answers.map((answer) => ({
                responseId: responseId,
                questionId: answer.questionId,
                value: answer.value,
                values: answer.values,
            }));

            await tx.answer.createMany({ data: answersToCreate });

            return existingResponse;
        });
    }

    async deleteResponse(
        formId: string,
        userId: string,
        responseId: string,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const existingResponse = await tx.response.findFirst({
                where: {
                    idResponse: responseId,
                },
            });

            if (!existingResponse) {
                throw new Error('Response not found');
            }
            
            await tx.response.delete({
                where: {
                    idResponse: responseId,
                },
            });

            await tx.answer.deleteMany({
                where: {
                    responseId: responseId,
                },
            });

            return { success: true };
        });
    }

    async findResponses(formId: string) {
        const result = await this.prisma.form.findUnique({
            where: { idForm: formId, active: true },
            include: {
                responses: {
                    include: {
                        user: {
                            select: {
                                idUser: true,
                                name: true,
                                email: true,
                            },
                        },
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
                    orderBy: {
                        submittedAt: 'desc',
                    },
                },
            },
        })

        return {
            ...result,
            responses: result?.responses.map(response => {
                let totalScore = 0;

                for (const answer of response.answers) {
                    const question = answer.question;

                    if (question.type === 'CHECKBOXES') {
                        const selectedOptions = question.options.filter(opt =>
                            answer.values.includes(opt.text)
                        );

                        for (const opt of selectedOptions) {
                            totalScore += (opt.value || 0);
                        }

                    } else if (question.type === 'MULTIPLE_CHOICE') {
                        const selectedOption = question.options.find(opt =>
                            opt.text === answer.value
                        );

                        if (selectedOption) {
                            totalScore += (selectedOption.value || 0);
                        }
                    }
                }

                return {
                    ...response,
                    totalScore,
                };
            })
        };
    }

    async findResponse(formId: string, responseId: string) {
        // fetch response directly in the same shape as findAllResponses
        const response = await this.prisma.response.findUnique({
            where: { idResponse: responseId },
            include: {
                form: {
                    select: {
                        idForm: true,
                        title: true,
                    },
                },
                user: {
                    select: {
                        idUser: true,
                        name: true,
                        email: true,
                    },
                },
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
        });

        if (!response || response.form?.idForm !== formId) {
            throw new NotFoundException(`Resposta com ID ${responseId} não encontrada para o formulário ${formId}.`);
        }

        let totalScore = 0;

        for (const answer of response.answers) {
            const question = answer.question;

            if (question.type === 'CHECKBOXES') {
                const selectedOptions = question.options.filter(opt =>
                    answer.values.includes(opt.text)
                );

                for (const opt of selectedOptions) {
                    totalScore += (opt.value || 0);
                }

            } else if (question.type === 'MULTIPLE_CHOICE') {
                const selectedOption = question.options.find(opt =>
                    opt.text === answer.value
                );

                if (selectedOption) {
                    totalScore += (selectedOption.value || 0);
                }
            }
        }

        return {
            ...response,
            totalScore,
        };

    }


    async findAllResponses(opts?: { page?: number; pageSize?: number }) {
        const baseWhere: any = { form: { active: true } };

        const mapWithScore = (responses: any[]) => responses.map(response => {
            let totalScore = 0;
            for (const answer of response.answers) {
                const question = answer.question;
                if (question.type === 'CHECKBOXES') {
                    const selectedOptions = question.options.filter((opt: any) => answer.values.includes(opt.text));
                    for (const opt of selectedOptions) totalScore += (opt.value || 0);
                } else if (question.type === 'MULTIPLE_CHOICE') {
                    const selectedOption = question.options.find((opt: any) => opt.text === answer.value);
                    if (selectedOption) totalScore += (selectedOption.value || 0);
                }
            }
            return { ...response, totalScore };
        });

        if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
            const result = await this.prisma.response.findMany({
                where: baseWhere,
                include: {
                    form: { select: { idForm: true, title: true } },
                    user: { select: { idUser: true, name: true, email: true } },
                    answers: { include: { question: { include: { options: true } } } },
                },
                orderBy: { submittedAt: 'desc' },
            });

            return mapWithScore(result);
        }

        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

        const [total, rows] = await Promise.all([
            this.prisma.response.count({ where: baseWhere }),
            this.prisma.response.findMany({
                where: baseWhere,
                include: {
                    form: { select: { idForm: true, title: true } },
                    user: { select: { idUser: true, name: true, email: true } },
                    answers: { include: { question: { include: { options: true } } } },
                },
                orderBy: { submittedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        const data = mapWithScore(rows as any[]);
        return { total, page, pageSize, data };
    }

    async findResponseDetail(responseId: string) {
        const response = await this.prisma.response.findUnique({
            where: { idResponse: responseId },
            include: {
                form: {
                    select: {
                        idForm: true,
                        title: true,
                    },
                },
                user: {
                    select: {
                        idUser: true,
                        name: true,
                        email: true,
                    },
                },
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
        });

        if (!response) {
            throw new NotFoundException(`Resposta com ID ${responseId} não encontrada.`);
        }

        let totalScore = 0;
        const answersWithScore: {
            idResponse: string;
            value: string | null;
            values: string[] | null;
            score: number;
            question: {
                idQuestion: string;
                text: string;
                type: string;
                options: {
                    idOption: string;
                    text: string;
                    value: number | null;
                }[];
            };
        }[] = [];

        for (const answer of response.answers) {
            const question = answer.question;
            let currentAnswerScore = 0;

            if (question.type === 'CHECKBOXES') {
                const selectedOptions = question.options.filter(opt =>
                    answer.values.includes(opt.text)
                );

                for (const opt of selectedOptions) {
                    currentAnswerScore += (opt.value || 0);
                }

            } else if (question.type === 'MULTIPLE_CHOICE') {
                const selectedOption = question.options.find(opt =>
                    opt.text === answer.value
                );

                if (selectedOption) {
                    currentAnswerScore = (selectedOption.value || 0);
                }

            }

            totalScore += currentAnswerScore;

            answersWithScore.push({
                idResponse: answer.idAnswer,
                value: answer.value,
                values: answer.values,
                score: currentAnswerScore,
                question: {
                    idQuestion: question.idQuestion,
                    text: question.text,
                    type: question.type,
                    options: question.options
                }
            });
        }

        return {
            ...response,
            answers: answersWithScore,
            totalScore: totalScore
        };
    }

    async getMyForms(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { idUser: userId },
            select: {
                idUser: true,
                name: true,
                email: true,
                fromAssigned: {
                    where: { active: true },
                    select: {
                        idForm: true,
                        title: true,
                        description: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },

            },
        });

        return user;
    }

    async getUsersToAssign() {
        const allUsers = await this.prisma.user.findMany({
            where: { type: 'PACIENTE' },
            select: {
                idUser: true,
                name: true,
                email: true,
            },
        });

        return allUsers;
    }

}