import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsQuery } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  async create(@Body() dto: CreateNotificationDto, @Req() req: Request) {
    const userId = (req as any).user?.idUser ?? (req as any).user?.id ?? null;
    return this.notifications.create(dto, userId);
  }

  @Get()
  async list(@Query() query: ListNotificationsQuery, @Req() req: Request) {
    const userId = (req as any).user?.idUser ?? (req as any).user?.id;
    return this.notifications.listForUser(userId, query);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: Request) {
    const userId = (req as any).user?.idUser ?? (req as any).user?.id;
    const count = await this.notifications.unreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Body() body: { read?: boolean }, @Req() req: Request) {
    const userId = (req as any).user?.idUser ?? (req as any).user?.id;
    await this.notifications.markRead(userId, id, body?.read ?? true);
    return { status: 204 };
  }

  @Patch('read-all')
  async markAllRead(
    @Body() body: { category?: string; before?: string },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.idUser ?? (req as any).user?.id;
    await this.notifications.markAllRead(userId, body?.category, body?.before);
    return { status: 204 };
  }

  @Delete(':id')
  async archive(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.idUser ?? (req as any).user?.id;
    await this.notifications.archive(userId, id);
    return { status: 204 };
  }
}