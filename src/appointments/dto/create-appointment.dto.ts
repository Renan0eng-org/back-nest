import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  doctorId: string;

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
}
