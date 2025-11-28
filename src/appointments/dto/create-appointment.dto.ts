import { IsISO8601, IsOptional, IsString, ValidateIf } from 'class-validator';

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
}
