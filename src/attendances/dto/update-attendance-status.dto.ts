import { IsEnum } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceStatusDto {
  @IsEnum(AttendanceStatus, {
    message: 'Status deve ser um dos valores: EmAndamento, Concluido, Cancelado',
  })
  status: AttendanceStatus;
}
