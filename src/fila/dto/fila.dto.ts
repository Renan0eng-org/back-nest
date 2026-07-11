import { QueuePriority } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
    @IsString()
    @IsNotEmpty({ message: 'O setor é obrigatório.' })
    setor: string;

    @IsString()
    @IsOptional()
    patientId?: string;

    @IsString()
    @IsOptional()
    patientName?: string;

    @IsEnum(QueuePriority)
    @IsOptional()
    priority?: QueuePriority;

    @IsInt()
    @IsOptional()
    grupoId?: number;
}

export class CallTicketDto {
    @IsString()
    @IsOptional()
    doctorId?: string;
}
