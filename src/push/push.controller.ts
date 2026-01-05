import { Body, Controller, Delete, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { Menu } from 'src/auth/menu.decorator';
import {
  SendNotificationDto,
  SendToMultipleUsersDto,
  SendToTopicDto,
  SubscribeDto,
  SubscribeToTopicDto,
} from './dto/subscribe.dto';
import { PushService } from './push.service';

@Controller('push')
@Menu('')
export class PushController {
  constructor(
    private readonly push: PushService,
    private readonly authService: AuthService,
  ) { }

  /**
   * Subscribe device to push notifications
   * Expects FCM device token from client
   */
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto, @Req() req: Request) {
    let token: string | undefined = undefined;
    let tokenType: 'access' | 'refresh' | 'any' = 'any';

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      tokenType = 'access';
    } else if (req.cookies && req.cookies['refresh_token']) {
      token = req.cookies['refresh_token'];
      tokenType = 'refresh';
    }

    if (!token) {
      throw new Error('Token não fornecido.');
    }

    // Validate token and fetch user with nivel_acesso + menus
    const validated = await this.authService.validateToken(token, { type: tokenType });
    const user = await this.authService.findUserById(validated.dataToken.sub);
    const userId = user.idUser;
    const id = await this.push.subscribe(userId, dto);
    return {
      id,
      message: 'Dispositivo registrado para notificações push',
    };
  }

  /**
   * Unsubscribe device from push notifications
   */
  @Delete('subscribe')
  async unsubscribe(@Body() body: { deviceToken: string }) {
    await this.push.disable(body.deviceToken);
    return {
      status: 204,
      message: 'Dispositivo removido do sistema de notificações',
    };
  }

  /**
   * Send push notification to current user
   */
  @Post('send')
  async sendToUser(@Body() dto: SendNotificationDto, @Req() req: Request) {
    let token: string | undefined = undefined;
    let tokenType: 'access' | 'refresh' | 'any' = 'any';

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      tokenType = 'access';
    } else if (req.cookies && req.cookies['refresh_token']) {
      token = req.cookies['refresh_token'];
      tokenType = 'refresh';
    }

    if (!token) {
      throw new Error('Token não fornecido.');
    }

    // Validate token and fetch user with nivel_acesso + menus
    const validated = await this.authService.validateToken(token, { type: tokenType });
    const user = await this.authService.findUserById(validated.dataToken.sub);
    const userId = user.idUser;
    const success = await this.push.sendToUser(userId, {
      title: dto.title,
      body: dto.body,
      data: dto.data,
      imageUrl: dto.imageUrl,
    });
    return {
      success,
      message: success ? 'Notificação enviada com sucesso' : 'Falha ao enviar notificação',
    };
  }

  /**
   * Send push notification to multiple users
   */
  @Post('send-multiple')
  async sendToMultipleUsers(@Body() dto: SendToMultipleUsersDto) {
    const successCount = await this.push.sendToMultipleUsers(dto.userIds, {
      title: dto.title,
      body: dto.body,
      data: dto.data,
      imageUrl: dto.imageUrl,
    });

    return {
      successCount,
      totalUsers: dto.userIds.length,
      message: `Notificações enviadas para ${successCount}/${dto.userIds.length} usuários`,
    };
  }

  /**
   * Send push notification to users subscribed to a topic
   */
  @Post('send-topic')
  async sendToTopic(@Body() dto: SendToTopicDto) {
    const messageId = await this.push.sendToTopic(dto.topic, {
      title: dto.title,
      body: dto.body,
      data: dto.data,
      imageUrl: dto.imageUrl,
    });

    return {
      messageId,
      topic: dto.topic,
      message: `Notificação enviada para o tópico ${dto.topic}`,
    };
  }

  /**
   * Subscribe users to a topic for group notifications
   */
  @Post('subscribe-topic')
  async subscribeToTopic(@Body() dto: SubscribeToTopicDto) {
    await this.push.subscribeToTopic(dto.userIds, dto.topic);
    return {
      message: `${dto.userIds.length} usuários inscritos no tópico ${dto.topic}`,
    };
  }

  /**
   * Unsubscribe users from a topic
   */
  @Delete('subscribe-topic')
  async unsubscribeFromTopic(@Body() dto: SubscribeToTopicDto) {
    await this.push.unsubscribeFromTopic(dto.userIds, dto.topic);
    return {
      message: `${dto.userIds.length} usuários removidos do tópico ${dto.topic}`,
    };
  }
}