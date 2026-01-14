import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Req,
    UnauthorizedException,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AppTokenGuard } from 'src/auth/app-token.guard';
import { AuthService } from 'src/auth/auth.service';
import { Menu } from 'src/auth/menu.decorator';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chats')
@Menu('chat-ai')
@UseGuards(AppTokenGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) {}

  private async getUserIdFromRequest(req: Request): Promise<string> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não fornecido');
    }

    const token = authHeader.split(' ')[1];
    const decoded = await this.authService.validateToken(token, { type: 'access' });
    if (!decoded?.valid || !decoded?.dataToken?.sub) {
      throw new UnauthorizedException('Token inválido');
    }

    return decoded.dataToken.sub;
  }

  @Post()
  @UsePipes(new ValidationPipe())
  async createChat(
    @Req() req: Request,
    @Body() dto: CreateChatDto,
  ) {
    const userId = await this.getUserIdFromRequest(req);
    return this.chatService.createChat(userId, dto);
  }

  @Get()
  async getUserChats(@Req() req: Request) {
    const userId = await this.getUserIdFromRequest(req);
    return this.chatService.getUserChats(userId);
  }

  @Get(':chatId')
  async getChat(
    @Req() req: Request,
    @Param('chatId') chatId: string,
  ) {
    const userId = await this.getUserIdFromRequest(req);
    return this.chatService.getChat(chatId, userId);
  }

  @Post(':chatId/messages')
  @UsePipes(new ValidationPipe())
  async addMessage(
    @Req() req: Request,
    @Param('chatId') chatId: string,
    @Body() dto: CreateMessageDto,
  ) {
    const userId = await this.getUserIdFromRequest(req);
    return this.chatService.addMessage(chatId, userId, dto);
  }

  @Delete(':chatId')
  async deleteChat(
    @Req() req: Request,
    @Param('chatId') chatId: string,
  ) {
    const userId = await this.getUserIdFromRequest(req);
    return this.chatService.deleteChat(chatId, userId);
  }

  @Post(':chatId/clear')
  async clearChat(
    @Req() req: Request,
    @Param('chatId') chatId: string,
  ) {
    const userId = await this.getUserIdFromRequest(req);
    return this.chatService.clearChat(chatId, userId);
  }
}
