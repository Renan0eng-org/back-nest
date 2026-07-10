import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateNivelAcessoDto {
    @IsString({ message: 'O nome deve ser um texto.' })
    @IsNotEmpty({ message: 'O nome é obrigatório.' })
    @MinLength(3, { message: 'O nome deve ter pelo menos 3 caracteres.' })
    nome: string

    @IsString({ message: 'A descrição deve ser um texto.' })
    @IsOptional()
    descricao?: string
}

export class UpdateNivelAcessoDto extends CreateNivelAcessoDto { }

export class UpdateNivelMenusDto {
    @IsArray({ message: 'menuIds deve ser um array.' })
    @IsInt({ each: true, message: 'Cada ID do menu deve ser um número inteiro.' })
    menuIds: number[]
}

export class CreateMenuAcessoDto {
    @IsString()
    @IsNotEmpty({ message: 'O nome do menu é obrigatório.' })
    nome: string

    @IsString()
    @IsNotEmpty({ message: 'O slug é obrigatório.' })
    @MinLength(3, { message: 'O slug deve ter pelo menos 3 caracteres.' })
    slug: string
}

export class UpdateMenuAcessoDto extends CreateMenuAcessoDto { }

export class UpdateUserNivelDto {
    @IsInt({ message: 'O ID do nível de acesso deve ser um número.' })
    @IsNotEmpty({ message: 'O ID do nível de acesso é obrigatório.' })
    nivelAcessoId: number
}

export class PermissaoItemDto {
    @IsInt()
    menuAcessoId: number

    @IsBoolean()
    visualizar: boolean

    @IsBoolean()
    criar: boolean

    @IsBoolean()
    editar: boolean

    @IsBoolean()
    excluir: boolean

    @IsBoolean()
    relatorio: boolean
}

export class UpdateNivelPermissoesDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PermissaoItemDto)
    permissoes: PermissaoItemDto[]
}
