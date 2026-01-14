// src/auth/dto/login-user.dto.ts
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class LoginUserDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @Matches(/^[0-9]{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' })
    cpf?: string;

    @IsString()
    password: string;
}
