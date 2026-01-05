import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AppTokenGuard } from 'src/auth/app-token.guard';
import { MenuPermissionGuard } from 'src/auth/menu-permission.guard';
import { Menu } from 'src/auth/menu.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin-dash')
@UseGuards(AppTokenGuard, MenuPermissionGuard)
@Menu('dash-admin')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  /**
   * GET /admin-dash/forms/responses/statistics
   * Retorna estatísticas de cada formulário com número de respostas e scores
   */
  @Get('forms/responses/statistics')
  async getFormResponsesStatistics(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('formId') formId?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const pageSizeNum = pageSize ? Math.min(100, Math.max(1, parseInt(pageSize, 10))) : 10;

    return this.dashboardService.getFormResponsesStatistics({
      page: pageNum,
      pageSize: pageSizeNum,
      from,
      to,
      formId,
    });
  }

  /**
   * GET /admin-dash/forms/statistics/by-origin
   * Retorna distribuição de formulários por origem (Web, Mobile, API, etc)
   */
  @Get('forms/statistics/by-origin')
  async getFormsByOrigin(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getFormsByOrigin({
      from,
      to,
    });
  }

  /**
   * GET /admin-dash/forms/statistics/top-forms
   * Retorna os top N formulários mais respondidos
   */
  @Get('forms/statistics/top-forms')
  async getTopForms(
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;

    return this.dashboardService.getTopForms({
      limit: limitNum,
      from,
      to,
    });
  }

  /**
   * GET /admin-dash/forms/statistics/average-scores
   * Retorna média de scores para cada formulário
   */
  @Get('forms/statistics/average-scores')
  async getAverageScores(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getAverageScores({
      from,
      to,
    });
  }

  /**
   * GET /admin-dash/forms/responses/timeline
   * Retorna histórico de respostas agrupadas por período (dia/semana/mês)
   */
  @Get('forms/responses/timeline')
  async getResponsesTimeline(
    @Query('groupBy') groupBy?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const allowedGroupBy: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];
    const validGroupBy: 'day' | 'week' | 'month' = allowedGroupBy.includes(groupBy as any)
      ? (groupBy as 'day' | 'week' | 'month')
      : 'day';

    return this.dashboardService.getResponsesTimeline({
      groupBy: validGroupBy,
      from,
      to,
    });
  }

  /**
   * GET /admin-dash/referrals/by-destination
   * Retorna encaminhamentos agrupados por destino (profissional/médico)
   */
  @Get('referrals/by-destination')
  async getReferralsByDestination(
    @Query('scheduledFrom') scheduledFrom?: string,
    @Query('scheduledTo') scheduledTo?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('status') status?: string,
    @Query('patientName') patientName?: string,
    @Query('professionalName') professionalName?: string,
    @Query('doctorName') doctorName?: string,
  ) {
    return this.dashboardService.getReferralsByDestination({
      scheduledFrom,
      scheduledTo,
      createdFrom,
      createdTo,
      status,
      patientName,
      professionalName,
      doctorName,
    });
  }

  /**
   * GET /admin-dash/referrals/timeline
   * Retorna série temporal de encaminhamentos agrupados por destino
   */
  @Get('referrals/timeline')
  async getReferralsTimeline(
    @Query('groupBy') groupBy?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const allowedGroupBy: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];
    const validGroupBy: 'day' | 'week' | 'month' = allowedGroupBy.includes(groupBy as any)
      ? (groupBy as 'day' | 'week' | 'month')
      : 'day';

    return this.dashboardService.getReferralsTimeline({
      groupBy: validGroupBy,
      from,
      to,
    });
  }
}
