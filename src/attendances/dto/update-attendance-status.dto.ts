import { IsEnum } from 'class-validator';
import { AttendanceStatus } from 'generated/prisma';

export class UpdateAttendanceStatusDto {
  @IsEnum(AttendanceStatus, {
    message: 'Status deve ser um dos valores: EmAndamento, Concluido, Cancelado',
  })
  status: AttendanceStatus;
}
