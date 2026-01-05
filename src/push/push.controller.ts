import { Body, Controller, Delete, Post, Req } from '@nestjs/common';
import { Request } from 'express';
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
  constructor(private readonly push: PushService) {}

  /**
   * Subscribe device to push notifications
   * Expects FCM device token from client
   */
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto, @Req() req: Request) {
    const userId = (req as any).user?.idUser ?? (req as any).user?.id;
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
    const userId = (req as any).user?.idUser ?? (req as any).user?.id;
    const success = await this.push.sendToUser(userId, dto);
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