import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from 'generated/prisma';

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
}
