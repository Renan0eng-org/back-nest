import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { AppointmentModality, AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsEnum(AppointmentModality, {
    message: 'modality deve ser Presencial ou Remoto',
  })
  modality?: AppointmentModality;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  meetingUrl?: string;
}
