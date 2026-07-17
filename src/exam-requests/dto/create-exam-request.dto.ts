import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ExamItemDto {
  @IsNotEmpty({ message: 'Nome do exame é obrigatório' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

/**
 * Solicitação de um ou mais exames para um paciente.
 * O médico pode vincular ao atendimento de origem e ao retorno onde os
 * resultados devem ser entregues.
 */
export class CreateExamRequestDto {
  @IsNotEmpty({ message: 'patientId é obrigatório' })
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  attendanceId?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos um exame' })
  @ValidateNested({ each: true })
  @Type(() => ExamItemDto)
  items: ExamItemDto[];
}
