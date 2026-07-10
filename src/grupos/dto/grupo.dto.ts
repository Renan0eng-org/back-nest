import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGrupoDto {
    @IsString()
    @IsNotEmpty({ message: 'O nome do grupo é obrigatório.' })
    nome: string;

    @IsString()
    @IsOptional()
    descricao?: string;
}

export class UpdateGrupoDto {
    @IsString()
    @IsOptional()
    nome?: string;

    @IsString()
    @IsOptional()
    descricao?: string;
}

export class AddMembrosDto {
    @IsArray()
    @IsString({ each: true })
    userIds: string[];
}
