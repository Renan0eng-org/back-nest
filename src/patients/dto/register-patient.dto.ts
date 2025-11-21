import { IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum SexDto {
  FEMININO = 'FEMININO',
  MASCULINO = 'MASCULINO',
  OUTRO = 'OUTRO',
}

export class RegisterPatientDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string; // ISO date string

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
}
