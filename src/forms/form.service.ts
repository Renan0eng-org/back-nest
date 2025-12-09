import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { SaveFormDto } from './dto/save-form.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

@Injectable()
export class FormService {
    constructor(private prisma: PrismaService) { }

    // Ensure score rule ranges do not overlap within the same form
    private ensureNoOverlap(rules: { minScore: number; maxScore: number; idScoreRule?: string }[]) {
        const list = [...rules].map(r => ({ ...r, minScore: Number(r.minScore), maxScore: Number(r.maxScore) }));
        for (const r of list) {
            if (r.minScore > r.maxScore) {
                throw new BadRequestException('minScore não pode ser maior que maxScore');
            }
        }
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i];
                const b = list[j];
                const overlaps = !(a.maxScore < b.minScore || a.minScore > b.maxScore);
                if (overlaps) {
                    throw new BadRequestException('Faixas de score não podem se sobrepor no mesmo formulário');
                }
            }
        }
    }

    private calculateScore(answers: any[]): number {
        let totalScore = 0;
        for (const answer of answers) {
            const question = answer.question;
            if (!question) continue;

            if (question.type === 'CHECKBOXES') {
                const selectedOptions = question.options?.filter((opt: any) => answer.values?.includes(opt.text)) || [];
                for (const opt of selectedOptions) {
                    totalScore += opt?.value ?? 0;
                }
            } else if (question.type === 'MULTIPLE_CHOICE') {
                const selectedOption = question.options?.find((opt: any) => opt.text === answer.value);
                if (selectedOption) {
                    totalScore += selectedOption.value ?? 0;
                }
            }
        }
        return totalScore;
    }

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

    async findAll(opts?: { page?: number; pageSize?: number; filters?: any }) {
        const filters = opts?.filters;

        const where: any = { active: true };

        if (filters) {
            if (filters.title) {
                where.title = { contains: filters.title, mode: 'insensitive' };
            }
            if (filters.description) {
                where.description = { contains: filters.description, mode: 'insensitive' };
            }
            
            if (filters.from || filters.to) {
                where.updatedAt = {};
                if (filters.from) {
                    const fromDate = new Date(filters.from);
                    if (!isNaN(fromDate.getTime())) where.updatedAt.gte = fromDate;
                }
                if (filters.to) {
                    const toDate = new Date(filters.to);
                    if (!isNaN(toDate.getTime())) where.updatedAt.lte = toDate;
                }
            }

            if (filters.createdFrom || filters.createdTo) {
                where.createdAt = where.createdAt || {};
                if (filters.createdFrom) {
                    const fromDate = new Date(filters.createdFrom);
                    if (!isNaN(fromDate.getTime())) where.createdAt.gte = fromDate;
                }
                if (filters.createdTo) {
                    const toDate = new Date(filters.createdTo);
                    if (!isNaN(toDate.getTime())) where.createdAt.lte = toDate;
                }
            }
            if (filters.createdAt) {
                const day = new Date(filters.createdAt);
                if (!isNaN(day.getTime())) {
                    const start = new Date(day);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(day);
                    end.setHours(23, 59, 59, 999);
                    where.createdAt = { ...(where.createdAt || {}), gte: start, lte: end };
                }
            }
            if (typeof filters.isScreening === 'boolean') {
                where.isScreening = filters.isScreening;
            }
        }

        const responsesMin = filters?.responsesMin;
        const responsesMax = filters?.responsesMax;

        const hasCountFilter = typeof responsesMin === 'number' || typeof responsesMax === 'number';

        // non-paginated path
        if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
            // if we need to filter by responses count, fetch counts and filter in JS
            const formsWithCount = await this.prisma.form.findMany({
                where,
                select: {
                    idForm: true,
                    title: true,
                    description: true,
                    updatedAt: true,
                    createdAt: true,
                    isScreening: true,
                    _count: { select: { responses: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });

            let mapped = formsWithCount.map(form => ({
                idForm: form.idForm,
                title: form.title,
                description: form.description,
                updatedAt: form.updatedAt,
                createdAt: form.createdAt,
                isScreening: form.isScreening,
                responses: form._count.responses,
            }));

            if (hasCountFilter) {
                mapped = mapped.filter(item => {
                    if (typeof responsesMin === 'number' && item.responses < responsesMin) return false;
                    if (typeof responsesMax === 'number' && item.responses > responsesMax) return false;
                    return true;
                });
            }

            return mapped;
        }

        // paginated path
        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

        if (hasCountFilter) {
            // fetch all with counts, filter in JS, then paginate the array
            const rows = await this.prisma.form.findMany({
                where,
                select: {
                    idForm: true,
                    title: true,
                    description: true,
                    updatedAt: true,
                    createdAt: true,
                    isScreening: true,
                    _count: { select: { responses: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });

            let mapped = rows.map(form => ({
                idForm: form.idForm,
                title: form.title,
                description: form.description,
                updatedAt: form.updatedAt,
                createdAt: form.createdAt,
                isScreening: form.isScreening,
                responses: form._count.responses,
            }));

            mapped = mapped.filter(item => {
                if (typeof responsesMin === 'number' && item.responses < responsesMin) return false;
                if (typeof responsesMax === 'number' && item.responses > responsesMax) return false;
                return true;
            });

            const total = mapped.length;
            const start = (page - 1) * pageSize;
            const data = mapped.slice(start, start + pageSize);
            return { total, page, pageSize, data };
        }

        // simple paginated DB query when no count filters
        const [total, rows] = await Promise.all([
            this.prisma.form.count({ where }),
            this.prisma.form.findMany({
                where,
                select: {
                    idForm: true,
                    title: true,
                    description: true,
                    updatedAt: true,
                    createdAt: true,
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
            createdAt: form.createdAt,
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
                scoreRules: {
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!form) {
            throw new NotFoundException(`Formulário com ID ${idForm} não encontrado.`);
        }
        return form;
    }

    async create(dto: SaveFormDto) {
        const { title, description, questions, scoreRules } = dto;

        if (scoreRules && scoreRules.length > 0) {
            this.ensureNoOverlap(scoreRules);
        }

        return this.prisma.form.create({
            data: {
                title,
                description,
                questions: {
                    create: questions.map((q, qIndex) => ({
                        text: q.text,
                        type: q.type,
                        required: q.required,
                        order: qIndex,
                        options: {
                            create: q.options.map((opt, oIndex) => ({
                                text: opt.text,
                                order: oIndex,
                                value: opt.value,
                            })),
                        },
                    })),
                },
                ...(scoreRules && scoreRules.length > 0 && {
                    scoreRules: {
                        create: scoreRules.map((rule, idx) => ({
                            minScore: rule.minScore,
                            maxScore: rule.maxScore,
                            classification: rule.classification,
                            conduct: rule.conduct,
                            targetUserId: rule.targetUserId,
                            order: rule.order !== undefined ? rule.order : idx,
                        })),
                    },
                }),
            },
        });
    }

    async update(formId: string, dto: SaveFormDto) {
        const { title, description, questions, scoreRules } = dto;

        return this.prisma.$transaction(async (tx) => {
            await tx.form.update({
                where: { idForm: formId },
                data: { title, description },
            });

            // Handle score rules update
            if (scoreRules !== undefined) {
                if (scoreRules.length > 0) {
                    this.ensureNoOverlap(scoreRules);
                }
                // Delete all existing rules and create new ones
                await (tx as any).scoreRule.deleteMany({
                    where: { formId },
                });

                if (scoreRules.length > 0) {
                    await (tx as any).scoreRule.createMany({
                        data: scoreRules.map((rule, idx) => ({
                            formId,
                            minScore: rule.minScore,
                            maxScore: rule.maxScore,
                            classification: rule.classification,
                            conduct: rule.conduct,
                            targetUserId: rule.targetUserId,
                            order: rule.order !== undefined ? rule.order : idx,
                        })),
                    });
                }
            }

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
                    scoreRules: {
                        orderBy: { order: 'asc' },
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

            // reload with answers and form score rules
            const responseWithAnswers = await tx.response.findUnique({
                where: { idResponse: newResponse.idResponse },
                include: {
                    answers: {
                        include: {
                            question: { include: { options: true } },
                        },
                    },
                    form: { include: { scoreRules: { orderBy: { order: 'asc' } } } },
                },
            });

            if (!responseWithAnswers) return newResponse;

            const totalScore = this.calculateScore(responseWithAnswers.answers);
            const matchedRule = responseWithAnswers.form.scoreRules.find(
                (rule: any) => totalScore >= rule.minScore && totalScore <= rule.maxScore,
            );

            // create or update appointment based on matched rule
            if (matchedRule?.targetUserId) {
                const targetUser = await tx.user.findUnique({ where: { idUser: matchedRule.targetUserId }, select: { type: true } });
                const isDoctor = targetUser?.type === 'MEDICO';

                const existingAppt = await (tx as any).appointment.findFirst({ where: { responseId: newResponse.idResponse } });
                const apptData = {
                    professionalId: isDoctor ? null : matchedRule.targetUserId,
                    doctorId: isDoctor ? matchedRule.targetUserId : null,
                    patientId: userId,
                    responseId: newResponse.idResponse,
                    scheduledAt: new Date(),
                    status: 'Pendente',
                    notes: matchedRule.conduct ?? null,
                    totalScoreAtTime: totalScore,
                };
                if (existingAppt) {
                    await (tx as any).appointment.update({ where: { id: existingAppt.id }, data: apptData });
                } else {
                    await (tx as any).appointment.create({ data: apptData });
                }
            }

            const updated = await tx.response.update({
                where: { idResponse: newResponse.idResponse },
                data: {
                    totalScore,
                    classification: matchedRule?.classification,
                    conduct: matchedRule?.conduct,
                    assignedToId: matchedRule?.targetUserId ?? null,
                    observations: matchedRule?.conduct ?? null,
                },
            });

            return updated;
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

            // reload with answers and form score rules
            const responseWithAnswers = await tx.response.findUnique({
                where: { idResponse: responseId },
                include: {
                    answers: {
                        include: {
                            question: { include: { options: true } },
                        },
                    },
                    form: { include: { scoreRules: { orderBy: { order: 'asc' } } } },
                },
            });

            if (!responseWithAnswers) return existingResponse;

            const totalScore = this.calculateScore(responseWithAnswers.answers);
            const matchedRule = responseWithAnswers.form.scoreRules.find(
                (rule: any) => totalScore >= rule.minScore && totalScore <= rule.maxScore,
            );

            // create or update appointment based on matched rule
            if (matchedRule?.targetUserId) {
                
                const targetUser = await tx.user.findUnique({ where: { idUser: matchedRule.targetUserId }, select: { type: true } });
                const isDoctor = targetUser?.type === 'MEDICO';

                const existingAppt = await (tx as any).appointment.findFirst({ where: { responseId: responseId } });
                const apptData = {
                    professionalId: isDoctor ? null : matchedRule.targetUserId,
                    doctorId: isDoctor ? matchedRule.targetUserId : null,
                    patientId: userId,
                    responseId: responseId,
                    scheduledAt: new Date(),
                    status: 'Pendente',
                    notes: matchedRule.conduct ?? null,
                    totalScoreAtTime: totalScore,
                };
                if (existingAppt) {
                    await (tx as any).appointment.update({ where: { id: existingAppt.id }, data: apptData });
                } else {
                    await (tx as any).appointment.create({ data: apptData });
                }
            }

            const updated = await tx.response.update({
                where: { idResponse: responseId },
                data: {
                    totalScore,
                    classification: matchedRule?.classification,
                    conduct: matchedRule?.conduct,
                    assignedToId: matchedRule?.targetUserId ?? null,
                    observations: matchedRule?.conduct ?? null,
                },
            });

            return updated;
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
                    orderBy: { question: { order: 'asc' } },
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
                    form: { select: { idForm: true, title: true, isScreening: true } },
                    user: { select: { idUser: true, name: true, email: true } },
                    answers: { 
                        include: { question: { include: { options: true } } },
                        orderBy: { question: { order: 'asc' } },
                    },
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

    // Score Rules Management
    async getScoreRules(formId: string) {
        const rules = await (this.prisma as any).scoreRule.findMany({
            where: { formId },
            orderBy: { order: 'asc' },
        });

        return rules;
    }

    async createScoreRule(formId: string, dto: any) {
        const form = await this.prisma.form.findUnique({
            where: { idForm: formId, active: true },
        });

        if (!form) throw new NotFoundException('Formulário não encontrado');

        const existing = await (this.prisma as any).scoreRule.findMany({ where: { formId } });
        this.ensureNoOverlap([...existing, dto]);

        const rule = await (this.prisma as any).scoreRule.create({
            data: {
                formId,
                minScore: dto.minScore,
                maxScore: dto.maxScore,
                classification: dto.classification,
                conduct: dto.conduct,
                targetUserId: dto.targetUserId,
                order: dto.order || 0,
            },
        });

        return rule;
    }

    async updateScoreRule(formId: string, ruleId: string, dto: any) {
        const rule = await (this.prisma as any).scoreRule.findFirst({
            where: { idScoreRule: ruleId, formId },
        });

        if (!rule) throw new NotFoundException('Regra não encontrada');

        const others = await (this.prisma as any).scoreRule.findMany({
            where: { formId, NOT: { idScoreRule: ruleId } },
        });
        this.ensureNoOverlap([...others, dto]);

        const updated = await (this.prisma as any).scoreRule.update({
            where: { idScoreRule: ruleId },
            data: {
                minScore: dto.minScore,
                maxScore: dto.maxScore,
                classification: dto.classification,
                conduct: dto.conduct,
                targetUserId: dto.targetUserId,
                order: dto.order,
            },
        });

        return updated;
    }

    async deleteScoreRule(formId: string, ruleId: string) {
        const rule = await (this.prisma as any).scoreRule.findFirst({
            where: { idScoreRule: ruleId, formId },
        });

        if (!rule) throw new NotFoundException('Regra não encontrada');

        await (this.prisma as any).scoreRule.delete({
            where: { idScoreRule: ruleId },
        });

        return { success: true };
    }

}