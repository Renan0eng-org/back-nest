import { IsOptional, IsString } from 'class-validator';

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsString({ message: 'Medicamento deve ser uma string' })
  medication?: string;

  @IsOptional()
  @IsString({ message: 'Dosagem deve ser uma string' })
  dosage?: string;

  @IsOptional()
  @IsString({ message: 'Frequência deve ser uma string' })
  frequency?: string;

  @IsOptional()
  @IsString({ message: 'Duração deve ser uma string' })
  duration?: string;

  @IsOptional()
  @IsString({ message: 'Instruções devem ser uma string' })
  instructions?: string;
}
