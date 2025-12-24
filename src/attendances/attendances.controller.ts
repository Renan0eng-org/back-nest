import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Request,
} from '@nestjs/common';
import { Menu } from 'src/auth/menu.decorator';
import { AttendancesService } from './attendances.service';
import { AssignFormsDto } from './dto/assign-forms.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateFromAppointmentDto } from './dto/create-from-appointment.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { LinkResponseDto } from './dto/link-response.dto';
import { UpdateAttendanceStatusDto } from './dto/update-attendance-status.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

@Controller('attendances')
@Menu('atendimento')
export class AttendancesController {
  constructor(private readonly service: AttendancesService) {}

  @Post()
  create(@Body() dto: CreateAttendanceDto, @Request() req?: any) {
    const userId = req?.user?.idUser;
    return this.service.create(dto, userId);
  }

  @Post('from-appointment/:appointmentId')
  createFromAppointment(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CreateFromAppointmentDto,
    @Request() req?: any,
  ) {
    const userId = req?.user?.idUser;
    return this.service.createFromAppointment(appointmentId, dto, userId);
  }

  @Get()
  findAll(
    @Query() query: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('patientName') patientName?: string,
    @Query('professionalName') professionalName?: string,
    @Query('status') status?: string,
    @Query('attendanceFrom') attendanceFrom?: string,
    @Query('attendanceTo') attendanceTo?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('appointmentId') appointmentId?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const ps = pageSize ? parseInt(pageSize, 10) : undefined;

    const filters: any = {};
    if (patientName) filters.patientName = patientName;
    if (professionalName) filters.professionalName = professionalName;
    if (status) filters.status = status;
    if (attendanceFrom) filters.attendanceFrom = attendanceFrom;
    if (attendanceTo) filters.attendanceTo = attendanceTo;
    if (createdFrom) filters.createdFrom = createdFrom;
    if (createdTo) filters.createdTo = createdTo;
    if (appointmentId) filters.appointmentId = appointmentId;

    const mergedQuery = { ...query, ...filters };
    return this.service.findAll(mergedQuery, p || ps ? { page: p, pageSize: ps } : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAttendanceStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ==================== PRESCRIPTIONS ====================

  @Post(':attendanceId/prescriptions')
  createPrescription(
    @Param('attendanceId') attendanceId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.service.createPrescription(attendanceId, dto);
  }

  @Put(':attendanceId/prescriptions/:prescriptionId')
  updatePrescription(
    @Param('attendanceId') attendanceId: string,
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.service.updatePrescription(attendanceId, prescriptionId, dto);
  }

  @Delete(':attendanceId/prescriptions/:prescriptionId')
  removePrescription(
    @Param('attendanceId') attendanceId: string,
    @Param('prescriptionId') prescriptionId: string,
  ) {
    return this.service.removePrescription(attendanceId, prescriptionId);
  }

  // ==================== ATTACHMENTS ====================
  // Note: File upload functionality would require additional setup with multer
  // This is a placeholder for the attachment endpoints

  @Delete(':attendanceId/attachments/:attachmentId')
  removeAttachment(
    @Param('attendanceId') attendanceId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.service.removeAttachment(attendanceId, attachmentId);
  }

  // ==================== FORMS & RESPONSES ====================

  @Get('forms/available')
  @Menu('')
  getAvailableForms(@Query('isScreening') isScreening?: string) {
    const screening = isScreening ? isScreening === 'true' : undefined;
    return this.service.getAvailableForms(screening);
  }

  @Post(':attendanceId/assign-forms')
  assignForms(
    @Param('attendanceId') attendanceId: string,
    @Body() dto: AssignFormsDto,
  ) {
    return this.service.assignForms(attendanceId, dto.formIds);
  }

  @Post(':attendanceId/unassign-forms')
  unassignForms(
    @Param('attendanceId') attendanceId: string,
    @Body() dto: AssignFormsDto,
  ) {
    return this.service.unassignForms(attendanceId, dto.formIds);
  }

  @Get(':attendanceId/assigned-forms')
  getAssignedForms(@Param('attendanceId') attendanceId: string) {
    return this.service.getAssignedForms(attendanceId);
  }

  @Post(':attendanceId/link-response')
  linkResponse(
    @Param('attendanceId') attendanceId: string,
    @Body() dto: LinkResponseDto,
  ) {
    return this.service.linkResponse(attendanceId, dto.responseId);
  }

  @Delete(':attendanceId/responses/:responseId')
  unlinkResponse(
    @Param('attendanceId') attendanceId: string,
    @Param('responseId') responseId: string,
  ) {
    return this.service.unlinkResponse(attendanceId, responseId);
  }

  @Get(':attendanceId/responses')
  getResponses(@Param('attendanceId') attendanceId: string) {
    return this.service.getResponses(attendanceId);
  }
}
