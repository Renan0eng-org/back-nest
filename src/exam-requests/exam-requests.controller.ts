import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ExamRequestStatus } from '@prisma/client';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { Menu } from '../auth/menu.decorator';
import { CreateExamRequestDto } from './dto/create-exam-request.dto';
import { SubmitExamResultDto } from './dto/submit-exam-result.dto';
import { UpdateExamStatusDto } from './dto/update-exam-status.dto';
import { ExamRequestsService } from './exam-requests.service';

@Controller('exam-requests')
@Menu('') // autentica via token (Bearer do app ou cookie), sem exigir menu específico
export class ExamRequestsController {
  constructor(
    private readonly service: ExamRequestsService,
    private readonly authService: AuthService,
  ) {}

  /** Resolve o usuário atual a partir do token (Bearer do app ou refresh cookie). */
  private async currentUserId(req: Request): Promise<string> {
    let token: string | undefined;
    let tokenType: 'access' | 'refresh' | 'any' = 'any';

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      tokenType = 'access';
    } else if (req.cookies?.['refresh_token']) {
      token = req.cookies['refresh_token'];
      tokenType = 'refresh';
    }
    if (!token) throw new UnauthorizedException('Token não fornecido.');

    const validated = await this.authService.validateToken(token, { type: tokenType });
    const user = await this.authService.findUserByIdBasic(validated.dataToken.sub);
    return user.idUser;
  }

  /** Médico solicita exames. */
  @Post()
  async create(@Body() dto: CreateExamRequestDto, @Req() req: Request) {
    const requesterId = await this.currentUserId(req);
    return this.service.create(dto, requesterId);
  }

  /** Lista os exames do paciente autenticado. */
  @Get('mine')
  async mine(
    @Req() req: Request,
    @Query('status') status?: ExamRequestStatus,
    @Query('appointmentId') appointmentId?: string,
  ) {
    const patientId = await this.currentUserId(req);
    return this.service.findForPatient(patientId, { status, appointmentId });
  }

  /** Listagem geral (médico), filtrável por paciente/atendimento/retorno/status. */
  @Get()
  async findAll(
    @Req() req: Request,
    @Query('patientId') patientId?: string,
    @Query('appointmentId') appointmentId?: string,
    @Query('attendanceId') attendanceId?: string,
    @Query('status') status?: ExamRequestStatus,
  ) {
    await this.currentUserId(req); // exige sessão válida
    return this.service.findAll({ patientId, appointmentId, attendanceId, status });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    await this.currentUserId(req);
    return this.service.findOne(id);
  }

  /** Paciente envia o resultado do exame. */
  @Post(':id/result')
  async submitResult(
    @Param('id') id: string,
    @Body() dto: SubmitExamResultDto,
    @Req() req: Request,
  ) {
    const patientId = await this.currentUserId(req);
    return this.service.submitResult(id, patientId, dto);
  }

  /** Médico atualiza o status (ex.: Avaliado). */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateExamStatusDto,
    @Req() req: Request,
  ) {
    await this.currentUserId(req);
    return this.service.updateStatus(id, dto.status);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.currentUserId(req);
    return this.service.remove(id);
  }
}
