import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Menu } from 'src/auth/menu.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
@Menu('agendamento')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) { }

  @Post("")
  create(@Body() dto: CreateAppointmentDto) {
    return this.service.create(dto);
  }

  @Get("")
  findAll(@Query() query: any, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = page ? parseInt(page, 10) : undefined;
    const ps = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.service.findAll(query, p || ps ? { page: p, pageSize: ps } : undefined as any);
  }

  @Menu('encaminhamento')
  @Get('referrals')
  findReferrals(@Query() query: any, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = page ? parseInt(page, 10) : undefined;
    const ps = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.service.findReferrals(query, p || ps ? { page: p, pageSize: ps } : undefined as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // lista os usuarios Profissional
  @Get('users/professional')
  findProfessionalUsers(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = page ? parseInt(page, 10) : undefined;
    const ps = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.service.findProfessionalUsers(p || ps ? { page: p, pageSize: ps } : undefined as any);
  }

}
