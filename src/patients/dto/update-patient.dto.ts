import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum SexDto {
  FEMININO = 'FEMININO',
  MASCULINO = 'MASCULINO',
  OUTRO = 'OUTRO',
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsEnum(SexDto)
  sexo?: SexDto;

  @IsOptional()
  @IsString()
  unidadeSaude?: string;

  @IsOptional()
  @IsString()
  medicamentos?: string;

  @IsOptional()
  @IsBoolean()
  exames?: boolean;

  @IsOptional()
  @IsString()
  examesDetalhes?: string;

  @IsOptional()
  @IsString()
  alergias?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
