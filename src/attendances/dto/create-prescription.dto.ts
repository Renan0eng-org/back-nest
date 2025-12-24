import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePrescriptionDto {
  @IsNotEmpty({ message: 'Medicamento é obrigatório' })
  @IsString({ message: 'Medicamento deve ser uma string' })
  medication: string;

  @IsNotEmpty({ message: 'Dosagem é obrigatória' })
  @IsString({ message: 'Dosagem deve ser uma string' })
  dosage: string;

  @IsNotEmpty({ message: 'Frequência é obrigatória' })
  @IsString({ message: 'Frequência deve ser uma string' })
  frequency: string;

  @IsNotEmpty({ message: 'Duração é obrigatória' })
  @IsString({ message: 'Duração deve ser uma string' })
  duration: string;

  @IsOptional()
  @IsString({ message: 'Instruções devem ser uma string' })
  instructions?: string;
}
