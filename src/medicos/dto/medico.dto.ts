import { DoctorStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateMedicoDto {
    @IsString()
    @IsNotEmpty({ message: 'O nome é obrigatório.' })
    name: string;

    @IsEmail({}, { message: 'E-mail inválido.' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'O CPF é obrigatório.' })
    cpf: string;

    @IsString()
    @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
    password: string;

    @IsString()
    @IsNotEmpty({ message: 'O CRM é obrigatório.' })
    crm: string;

    @IsString()
    @IsNotEmpty({ message: 'A especialidade é obrigatória.' })
    especialidade: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsInt()
    @IsOptional()
    grupoId?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    cargaHoraria?: number;

    @IsEnum(DoctorStatus)
    @IsOptional()
    status?: DoctorStatus;
}

export class UpdateMedicoDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    crm?: string;

    @IsString()
    @IsOptional()
    especialidade?: string;

    @IsInt()
    @IsOptional()
    grupoId?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    cargaHoraria?: number;

    @IsEnum(DoctorStatus)
    @IsOptional()
    status?: DoctorStatus;
}
