import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AssignFormsDto {
  @IsNotEmpty({ message: 'A lista de formulários é obrigatória' })
  @IsArray({ message: 'A lista de formulários deve ser um array' })
  @IsString({ each: true, message: 'Cada ID de formulário deve ser uma string' })
  formIds: string[];
}
