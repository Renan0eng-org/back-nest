import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class SaveScoreRuleDto {
    @IsInt()
    @Min(0)
    @IsNotEmpty()
    minScore: number;

    @IsInt()
    @Min(0)
    @IsNotEmpty()
    maxScore: number;

    @IsString()
    @IsNotEmpty()
    classification: string;

    @IsString()
    @IsNotEmpty()
    conduct: string;

    @IsString()
    @IsOptional()
    targetUserId?: string;

    @IsInt()
    @IsOptional()
    order?: number;
}
