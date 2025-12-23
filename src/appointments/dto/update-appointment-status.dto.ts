import { IsEnum } from 'class-validator';
import { AppointmentStatus } from 'generated/prisma';

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus, {
    message: 'Status deve ser um dos valores: Pendente, Confirmado, Cancelado, Completo',
  })
  status: AppointmentStatus;
}
