import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { QuestionType } from 'generated/prisma';

class OptionDto {
  @IsOptional()
  @IsString()
  idOption?: string;

  @IsString()
  text: string;

  @IsOptional()
  value: number;
}

class QuestionDto {
  @IsOptional()
  @IsString()
  idQuestion?: string;

  @IsString()
  text: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsBoolean()
  required: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];
}

export class SaveFormDto {
  @IsString()
  @MinLength(4, { message: 'O título deve ter no mínimo 4 caracteres' })
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}