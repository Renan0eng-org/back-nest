import { ExamRequestStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateExamStatusDto {
  @IsEnum(ExamRequestStatus, {
    message: 'status deve ser Pendente, Enviado, Avaliado ou Cancelado',
  })
  status: ExamRequestStatus;
}
