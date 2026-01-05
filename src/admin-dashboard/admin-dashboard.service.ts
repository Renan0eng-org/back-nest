import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

interface DateRange {
  from?: string;
  to?: string;
}

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Converte data ISO string para Date, com validação
   */
  private parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Data inválida: ${dateStr}. Use formato ISO (YYYY-MM-DD ou ISO 8601)`);
    }
    return date;
  }

  /**
   * Rota 1: GET /admin-dash/forms/responses/statistics
   * Retorna estatísticas de cada formulário com número de respostas e scores
   */
  async getFormResponsesStatistics(options: {
    page: number;
    pageSize: number;
    from?: string;
    to?: string;
    formId?: string;
  }) {
    const { page, pageSize, from, to, formId } = options;

    if (page < 1) throw new BadRequestException('Página deve ser >= 1');
    if (pageSize < 1 || pageSize > 100) throw new BadRequestException('PageSize deve estar entre 1 e 100');

    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);

    // Build where clause for responses
    const where: any = {};
    if (fromDate || toDate) {
      where.submittedAt = {};
      if (fromDate) where.submittedAt.gte = fromDate;
      if (toDate) where.submittedAt.lte = toDate;
    }
    if (formId) {
      where.idForm = formId;
    }

    // Get all forms with their responses
    const forms = await this.prisma.form.findMany({
      where: { active: true },
      select: {
        idForm: true,
        title: true,
        responses: {
          where,
          select: {
            idResponse: true,
            totalScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate statistics per form
    const stats = forms
      .filter((form) => {
        if (formId) return form.idForm === formId;
        return form.responses.length > 0;
      })
      .map((form) => {
        const scores = form.responses.map((r) => r.totalScore ?? 0).filter((s) => !isNaN(s));
        const responseCount = form.responses.length;
        const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const minScore = scores.length > 0 ? Math.min(...scores) : 0;
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

        return {
          id: form.idForm,
          title: form.title,
          responseCount,
          averageScore: parseFloat(averageScore.toFixed(2)),
          minScore: parseFloat(minScore.toFixed(2)),
          maxScore: parseFloat(maxScore.toFixed(2)),
        };
      });

    // Paginate
    const total = stats.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = stats.slice(start, start + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Rota 2: GET /admin-dash/forms/statistics/by-origin
   * Retorna distribuição de formulários por origem
   */
  async getFormsByOrigin(options: DateRange) {
    const { from, to } = options;

    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);

    const where: any = {};
    if (fromDate || toDate) {
      where.submittedAt = {};
      if (fromDate) where.submittedAt.gte = fromDate;
      if (toDate) where.submittedAt.lte = toDate;
    }

    const responses = await this.prisma.response.findMany({
      where,
      select: {
        idResponse: true,
        attendanceResponses: { select: { id: true } },
        form: { select: { isScreening: true } },
      },
    });

    const originMap = new Map<string, number>();

    responses.forEach((response) => {
      const isAttendance = Array.isArray(response.attendanceResponses) && response.attendanceResponses.length > 0;
      const isScreening = !!response.form?.isScreening;
      const badgeText = isAttendance ? 'Atendimento' : (isScreening ? 'Triagem' : 'App');
      originMap.set(badgeText, (originMap.get(badgeText) || 0) + 1);
    });

    const total = responses.length;
    const data = Array.from(originMap.entries())
      .map(([origin, count]) => ({
        origin,
        count,
        percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { data };
  }

  /**
   * Rota 3: GET /admin-dash/forms/statistics/top-forms
   * Retorna os top N formulários mais respondidos
   */
  async getTopForms(options: {
    limit: number;
    from?: string;
    to?: string;
  }) {
    const { limit, from, to } = options;

    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);

    const where: any = {};
    if (fromDate || toDate) {
      where.submittedAt = {};
      if (fromDate) where.submittedAt.gte = fromDate;
      if (toDate) where.submittedAt.lte = toDate;
    }

    // Get forms with response counts
    const forms = await this.prisma.form.findMany({
      where: { active: true },
      select: {
        idForm: true,
        title: true,
        responses: {
          where,
          select: { idResponse: true },
        },
      },
    });

    // Sort by response count and limit
    const data = forms
      .map((form) => ({
        id: form.idForm,
        title: form.title,
        responseCount: form.responses.length,
      }))
      .sort((a, b) => b.responseCount - a.responseCount)
      .slice(0, limit);

    return { data };
  }

  /**
   * Rota 4: GET /admin-dash/forms/statistics/average-scores
   * Retorna média de scores para cada formulário
   */
  async getAverageScores(options: DateRange) {
    const { from, to } = options;

    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);

    const where: any = {};
    if (fromDate || toDate) {
      where.submittedAt = {};
      if (fromDate) where.submittedAt.gte = fromDate;
      if (toDate) where.submittedAt.lte = toDate;
    }

    // Get forms with their responses
    const forms = await this.prisma.form.findMany({
      where: { active: true },
      select: {
        idForm: true,
        title: true,
        responses: {
          where,
          select: {
            totalScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate scores per form
    const data = forms
      .filter((form) => form.responses.length > 0)
      .map((form) => {
        const scores = form.responses.map((r) => r.totalScore ?? 0).filter((s) => !isNaN(s));
        const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const minScore = scores.length > 0 ? Math.min(...scores) : 0;
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

        return {
          id: form.idForm,
          title: form.title,
          averageScore: parseFloat(averageScore.toFixed(2)),
          minScore: parseFloat(minScore.toFixed(2)),
          maxScore: parseFloat(maxScore.toFixed(2)),
          responseCount: form.responses.length,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore);

    return { data };
  }

  /**
   * Rota 5: GET /admin-dash/forms/responses/timeline
   * Retorna histórico de respostas agrupadas por período
   */
  async getResponsesTimeline(options: {
    groupBy: 'day' | 'week' | 'month';
    from?: string;
    to?: string;
  }) {
    const { groupBy, from, to } = options;

    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);

    const where: any = {};
    if (fromDate || toDate) {
      where.submittedAt = {};
      if (fromDate) where.submittedAt.gte = fromDate;
      if (toDate) where.submittedAt.lte = toDate;
    }

    // Get all responses
    const responses = await this.prisma.response.findMany({
      where,
      select: {
        submittedAt: true,
        totalScore: true,
      },
      orderBy: { submittedAt: 'asc' },
    });

    // Group by period
    const groupedData = new Map<string, { totalResponses: number; scores: number[] }>();

    responses.forEach((resp) => {
      const date = new Date(resp.submittedAt);
      let period: string;

      if (groupBy === 'day') {
        period = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day;
        weekStart.setDate(diff);
        period = weekStart.toISOString().split('T')[0];
      } else {
        // month
        period = date.toISOString().substring(0, 7); // YYYY-MM
      }

      if (!groupedData.has(period)) {
        groupedData.set(period, { totalResponses: 0, scores: [] });
      }

      const data = groupedData.get(period)!;
      data.totalResponses++;
      const score = resp.totalScore;
      if (typeof score === 'number' && !isNaN(score)) {
        data.scores.push(score);
      }
    });

    // Build response
    const data = Array.from(groupedData.entries())
      .map(([period, { totalResponses, scores }]) => ({
        date: period,
        period,
        totalResponses,
        averageScore: scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return { data };
  }

  /**
   * Rota 6: GET /admin-dash/referrals/by-destination
   * Retorna encaminhamentos agrupados por destino (profissional/médico)
   */
  async getReferralsByDestination(options: {
    scheduledFrom?: string;
    scheduledTo?: string;
    createdFrom?: string;
    createdTo?: string;
    status?: string;
    patientName?: string;
    professionalName?: string;
    doctorName?: string;
  }) {
    const {
      scheduledFrom,
      scheduledTo,
      createdFrom,
      createdTo,
      status,
      patientName,
      professionalName,
      doctorName,
    } = options;

    const scheduledFromDate = this.parseDate(scheduledFrom);
    const scheduledToDate = this.parseDate(scheduledTo);
    const createdFromDate = this.parseDate(createdFrom);
    const createdToDate = this.parseDate(createdTo);

    const where: any = {};

    // Filter by scheduledAt
    if (scheduledFromDate || scheduledToDate) {
      where.scheduledAt = {};
      if (scheduledFromDate) where.scheduledAt.gte = scheduledFromDate;
      if (scheduledToDate) where.scheduledAt.lte = scheduledToDate;
    }

    // Filter by createdAt
    if (createdFromDate || createdToDate) {
      where.createdAt = {};
      if (createdFromDate) where.createdAt.gte = createdFromDate;
      if (createdToDate) where.createdAt.lte = createdToDate;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by patient name
    if (patientName) {
      where.patient = {
        name: { contains: patientName, mode: 'insensitive' },
      };
    }

    // Filter by professional name
    if (professionalName) {
      where.professional = {
        name: { contains: professionalName, mode: 'insensitive' },
      };
    }

    // Filter by doctor name
    if (doctorName) {
      where.doctor = {
        name: { contains: doctorName, mode: 'insensitive' },
      };
    }

    // Get appointments with professional/doctor info
    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        id: true,
        professionalId: true,
        doctorId: true,
        professional: {
          select: { name: true },
        },
        doctor: {
          select: { name: true },
        },
      },
    });

    // Group by destination (professional or doctor)
    const destinationMap = new Map<string, number>();

    appointments.forEach((appointment) => {
      let destination = 'Não informado';

      if (appointment.professional?.name) {
        destination = appointment.professional.name;
      } else if (appointment.doctor?.name) {
        destination = appointment.doctor.name;
      }

      destinationMap.set(destination, (destinationMap.get(destination) || 0) + 1);
    });

    // Build response
    const data = Array.from(destinationMap.entries())
      .map(([destination, count]) => ({
        destination,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return { data };
  }

  /**
   * Rota 7: GET /admin-dash/referrals/timeline
   * Retorna série temporal de encaminhamentos agrupados por destino
   */
  async getReferralsTimeline(options: {
    groupBy: 'day' | 'week' | 'month';
    from?: string;
    to?: string;
  }) {
    const { groupBy, from, to } = options;

    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);

    const where: any = {};
    if (fromDate || toDate) {
      where.scheduledAt = {};
      if (fromDate) where.scheduledAt.gte = fromDate;
      if (toDate) where.scheduledAt.lte = toDate;
    }

    // Get appointments with scheduling date and destination info
    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        scheduledAt: true,
        professional: {
          select: { name: true },
        },
        doctor: {
          select: { name: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Group by period and destination
    const timelineMap = new Map<string, Record<string, number>>();

    appointments.forEach((appointment) => {
      const date = new Date(appointment.scheduledAt);
      let period: string;

      if (groupBy === 'day') {
        period = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day;
        weekStart.setDate(diff);
        period = weekStart.toISOString().split('T')[0];
      } else {
        // month
        period = date.toISOString().substring(0, 7); // YYYY-MM
      }

      // Get destination name
      let destination = 'Não informado';
      if (appointment.professional?.name) {
        destination = appointment.professional.name;
      } else if (appointment.doctor?.name) {
        destination = appointment.doctor.name;
      }

      // Initialize period if needed
      if (!timelineMap.has(period)) {
        timelineMap.set(period, {});
      }

      const periodData = timelineMap.get(period)!;
      periodData[destination] = (periodData[destination] || 0) + 1;
    });

    // Build response array
    const data = Array.from(timelineMap.entries())
      .map(([date, destinations]) => ({
        date,
        ...destinations,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { data };
  }
}
