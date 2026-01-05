import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubscribeDto {
  @IsNotEmpty({ message: 'Device token é obrigatório' })
  @IsString({ message: 'Device token deve ser uma string' })
  deviceToken!: string;

  @IsOptional()
  @IsString({ message: 'User agent deve ser uma string' })
  userAgent?: string;
}

export class SendNotificationDto {
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @IsString({ message: 'Título deve ser uma string' })
  title!: string;

  @IsNotEmpty({ message: 'Corpo é obrigatório' })
  @IsString({ message: 'Corpo deve ser uma string' })
  body!: string;

  @IsOptional()
  data?: Record<string, string>;

  @IsOptional()
  @IsString({ message: 'URL da imagem deve ser uma string' })
  imageUrl?: string;
}

export class SendToMultipleUsersDto {
  @IsNotEmpty({ message: 'IDs de usuários são obrigatórios' })
  userIds!: string[];

  @IsNotEmpty({ message: 'Título é obrigatório' })
  @IsString({ message: 'Título deve ser uma string' })
  title!: string;

  @IsNotEmpty({ message: 'Corpo é obrigatório' })
  @IsString({ message: 'Corpo deve ser uma string' })
  body!: string;

  @IsOptional()
  data?: Record<string, string>;

  @IsOptional()
  @IsString({ message: 'URL da imagem deve ser uma string' })
  imageUrl?: string;
}

export class SendToTopicDto {
  @IsNotEmpty({ message: 'Topic é obrigatório' })
  @IsString({ message: 'Topic deve ser uma string' })
  topic!: string;

  @IsNotEmpty({ message: 'Título é obrigatório' })
  @IsString({ message: 'Título deve ser uma string' })
  title!: string;

  @IsNotEmpty({ message: 'Corpo é obrigatório' })
  @IsString({ message: 'Corpo deve ser uma string' })
  body!: string;

  @IsOptional()
  data?: Record<string, string>;

  @IsOptional()
  @IsString({ message: 'URL da imagem deve ser uma string' })
  imageUrl?: string;
}

export class SubscribeToTopicDto {
  @IsNotEmpty({ message: 'IDs de usuários são obrigatórios' })
  userIds!: string[];

  @IsNotEmpty({ message: 'Topic é obrigatório' })
  @IsString({ message: 'Topic deve ser uma string' })
  topic!: string;
}