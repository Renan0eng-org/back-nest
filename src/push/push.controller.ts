import { Body, Controller, Delete, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Menu } from 'src/auth/menu.decorator';
import { SubscribeDto } from './dto/subscribe.dto';
import { PushService } from './push.service';

@Controller('push')
@Menu('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto, @Req() req: Request) {
    const userId = (req as any).user?.idUser ?? (req as any).user?.id;
    const id = await this.push.subscribe(userId, dto);
    return { id };
  }

  @Delete('subscribe')
  async unsubscribe(@Body() body: { endpoint: string }) {
    await this.push.disable(body.endpoint);
    return { status: 204 };
  }
}