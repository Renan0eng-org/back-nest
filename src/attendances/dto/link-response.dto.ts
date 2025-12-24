import { IsNotEmpty, IsString } from 'class-validator';

export class LinkResponseDto {
  @IsNotEmpty({ message: 'ID da resposta é obrigatório' })
  @IsString({ message: 'ID da resposta deve ser uma string' })
  responseId: string;
}
