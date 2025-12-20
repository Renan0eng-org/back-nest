import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import webPush from 'web-push';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  constructor(private prisma: PrismaService) {
    const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:admin@example.com';
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    const privateKey = process.env.VAPID_PRIVATE_KEY || '';
    if (publicKey && privateKey) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      this.logger.warn('VAPID keys missing; web-push disabled.');
    }
  }

  async subscribe(userId: string, dto: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }) {
    const existing = await this.prisma.pushSubscription.findUnique({ where: { endpoint: dto.endpoint } });
    if (existing) {
      const updated = await this.prisma.pushSubscription.update({
        where: { endpoint: dto.endpoint },
        data: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth, userAgent: dto.userAgent ?? existing.userAgent, disabledAt: null },
      });
      return updated.id;
    }
    const created = await this.prisma.pushSubscription.create({
      data: { userId, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth, userAgent: dto.userAgent },
    });
    return created.id;
  }

  async disable(endpoint: string) {
    await this.prisma.pushSubscription.updateMany({ where: { endpoint }, data: { disabledAt: new Date() } });
  }

  async sendToUser(userId: string, payload: any): Promise<boolean> {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId, disabledAt: null } });
    if (!subs.length) return false;
    let deliveredAny = false;
    for (const s of subs) {
      try {
        await webPush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          } as any,
          JSON.stringify(payload),
        );
        deliveredAny = true;
        await this.prisma.pushSubscription.update({ where: { id: s.id }, data: { lastSuccessAt: new Date() } });
      } catch (err: any) {
        const statusCode = err?.statusCode || err?.status || 0;
        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.pushSubscription.update({ where: { id: s.id }, data: { disabledAt: new Date() } });
        }
        this.logger.warn(`web-push error for ${s.id}: ${statusCode}`);
      }
    }
    return deliveredAny;
  }
}