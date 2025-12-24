import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { AttendanceStatus } from 'generated/prisma';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsDateString({}, { message: 'Data do atendimento deve ser uma data válida' })
  attendanceDate?: string;

  @IsOptional()
  @IsString({ message: 'Queixa principal deve ser uma string' })
  chiefComplaint?: string;

  @IsOptional()
  @IsString({ message: 'História da doença atual deve ser uma string' })
  presentingIllness?: string;

  @IsOptional()
  @IsString({ message: 'Histórico médico deve ser uma string' })
  medicalHistory?: string;

  @IsOptional()
  @IsString({ message: 'Exame físico deve ser uma string' })
  physicalExamination?: string;

  @IsOptional()
  @IsString({ message: 'Diagnóstico deve ser uma string' })
  diagnosis?: string;

  @IsOptional()
  @IsString({ message: 'Tratamento deve ser uma string' })
  treatment?: string;

  @IsOptional()
  @IsString({ message: 'Pressão arterial deve ser uma string' })
  bloodPressure?: string;

  @IsOptional()
  @IsInt({ message: 'Frequência cardíaca deve ser um número inteiro' })
  @Min(0, { message: 'Frequência cardíaca deve ser maior ou igual a 0' })
  @Max(300, { message: 'Frequência cardíaca deve ser menor ou igual a 300' })
  heartRate?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Temperatura deve ser um número' })
  @Min(30, { message: 'Temperatura deve ser maior ou igual a 30°C' })
  @Max(45, { message: 'Temperatura deve ser menor ou igual a 45°C' })
  temperature?: number;

  @IsOptional()
  @IsInt({ message: 'Frequência respiratória deve ser um número inteiro' })
  @Min(0, { message: 'Frequência respiratória deve ser maior ou igual a 0' })
  @Max(100, { message: 'Frequência respiratória deve ser menor ou igual a 100' })
  respiratoryRate?: number;

  @IsOptional()
  @IsEnum(AttendanceStatus, { message: 'Status deve ser um dos valores: EmAndamento, Concluido, Cancelado' })
  status?: AttendanceStatus;
}
