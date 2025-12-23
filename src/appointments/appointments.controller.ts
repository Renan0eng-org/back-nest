import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Menu } from 'src/auth/menu.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@Controller('appointments')
@Menu('agendamento')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) { }

  @Post("")
  create(@Body() dto: CreateAppointmentDto) {
    return this.service.create(dto);
  }

  @Get("")
  findAll(
    @Query() query: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('patientName') patientName?: string,
    @Query('doctorName') doctorName?: string,
    @Query('scheduledFrom') scheduledFrom?: string,
    @Query('scheduledTo') scheduledTo?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('status') status?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const ps = pageSize ? parseInt(pageSize, 10) : undefined;

    const filters: any = {};
    if (patientName) filters.patientName = patientName;
    if (doctorName) filters.doctorName = doctorName;
    if (scheduledFrom) filters.scheduledFrom = scheduledFrom;
    if (scheduledTo) filters.scheduledTo = scheduledTo;
    if (createdFrom) filters.createdFrom = createdFrom;
    if (createdTo) filters.createdTo = createdTo;
    if (status) filters.status = status;

    const mergedQuery = { ...query, ...filters };
    return this.service.findAll(mergedQuery, p || ps ? { page: p, pageSize: ps } : undefined as any);
  }

  @Menu('encaminhamento')
  @Get('referrals')
  findReferrals(
    @Query() query: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('patientName') patientName?: string,
    @Query('professionalName') professionalName?: string,
    @Query('scheduledFrom') scheduledFrom?: string,
    @Query('scheduledTo') scheduledTo?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('status') status?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const ps = pageSize ? parseInt(pageSize, 10) : undefined;

    const filters: any = {};
    if (patientName) filters.patientName = patientName;
    if (professionalName) filters.professionalName = professionalName;
    if (scheduledFrom) filters.scheduledFrom = scheduledFrom;
    if (scheduledTo) filters.scheduledTo = scheduledTo;
    if (createdFrom) filters.createdFrom = createdFrom;
    if (createdTo) filters.createdTo = createdTo;
    if (status) filters.status = status;

    const mergedQuery = { ...query, ...filters };
    return this.service.findReferrals(mergedQuery, p || ps ? { page: p, pageSize: ps } : undefined as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // lista os usuarios Profissional
  @Get('users/professional')
  @Menu('')
  findProfessionalUsers(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = page ? parseInt(page, 10) : undefined;
    const ps = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.service.findProfessionalUsers(p || ps ? { page: p, pageSize: ps } : undefined as any);
  }

}
