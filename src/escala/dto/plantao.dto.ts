import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePlantaoDto {
    // Opcional: quando ausente, o plantão é criado "Aberto" para o grupo pegar.
    @IsString()
    @IsOptional()
    doctorId?: string;

    @IsString()
    @IsNotEmpty({ message: 'O setor é obrigatório.' })
    setor: string;

    @IsDateString({}, { message: 'Início inválido.' })
    startsAt: string;

    @IsDateString({}, { message: 'Fim inválido.' })
    endsAt: string;

    @IsInt()
    @IsOptional()
    grupoId?: number;
}

export class UpdatePlantaoDto {
    // Reatribuir médico (string vazia = devolver ao mercado / deixar aberto).
    @IsString()
    @IsOptional()
    doctorId?: string;

    @IsString()
    @IsOptional()
    setor?: string;

    @IsDateString({}, { message: 'Início inválido.' })
    @IsOptional()
    startsAt?: string;

    @IsDateString({}, { message: 'Fim inválido.' })
    @IsOptional()
    endsAt?: string;

    @IsInt()
    @IsOptional()
    grupoId?: number;
}
