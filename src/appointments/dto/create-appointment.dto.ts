import { AppointmentModality } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateAppointmentDto {
  @ValidateIf(o => !o.professionalId)
  @IsString()
  doctorId?: string;

  @ValidateIf(o => !o.doctorId)
  @IsString()
  professionalId?: string;

  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  responseId?: string;

  @IsISO8601()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(AppointmentModality, {
    message: 'modality deve ser Presencial ou Remoto',
  })
  modality?: AppointmentModality;

  /** Endereço/unidade — usado quando presencial. */
  @IsOptional()
  @IsString()
  location?: string;

  /** Link da teleconsulta — usado quando remoto. */
  @IsOptional()
  @IsString()
  meetingUrl?: string;

  /** Atendimento de origem, quando este agendamento é um retorno. */
  @IsOptional()
  @IsString()
  originAttendanceId?: string;
}
