import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * O paciente envia o resultado como URL de arquivo já hospedado (ex.: storage
 * cifrado). O servidor guarda apenas a referência, não o conteúdo clínico.
 */
export class SubmitExamResultDto {
  @IsNotEmpty({ message: 'resultUrl é obrigatório' })
  @IsString()
  resultUrl: string;

  @IsOptional()
  @IsString()
  resultFileName?: string;

  @IsOptional()
  @IsString()
  resultType?: string;
}
