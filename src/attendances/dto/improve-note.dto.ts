import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ImproveNoteDto {
  @IsNotEmpty({ message: 'Texto é obrigatório' })
  @IsString()
  text: string;

  @IsOptional()
  @IsIn(['whole', 'selection'], { message: 'scope deve ser "whole" ou "selection"' })
  scope?: 'whole' | 'selection';

  @IsOptional()
  @IsIn(['html', 'text'], { message: 'format deve ser "html" ou "text"' })
  format?: 'html' | 'text';

  @IsOptional()
  @IsString()
  noteTitle?: string;
}
