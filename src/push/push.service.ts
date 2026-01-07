import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    if (!admin.apps.length) {
      try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
          ? JSON.parse(
            Buffer.from(
              process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
              'base64'
            ).toString('utf8')
          )
          : require('../../../firebase-adminsdk.json')

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })

        this.logger.log('Firebase Admin SDK initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin SDK:', error);
      }
    }
  }

  /**
   * Subscribe user to push notifications using FCM device token
   * @param userId User ID
   * @param dto Object containing FCM device token
   */
  async subscribe(userId: string, dto: { deviceToken: string; userAgent?: string }) {
    try {
      const existing = await this.prisma.pushSubscription.findUnique({
        where: { endpoint: dto.deviceToken },
      });

      if (existing) {
        const updated = await this.prisma.pushSubscription.update({
          where: { endpoint: dto.deviceToken },
          data: {
            userId,
            userAgent: dto.userAgent ?? existing.userAgent,
            disabledAt: null,
          },
        });
        return updated.id;
      }

      const created = await this.prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: dto.deviceToken,
          p256dh: 'firebase', // Placeholder for FCM
          auth: 'firebase', // Placeholder for FCM
          userAgent: dto.userAgent,
        },
      });

      return created.id;
    } catch (error) {
      this.logger.error('Error subscribing user to push:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from push notifications
   * @param deviceToken FCM device token
   */
  async disable(deviceToken: string) {
    try {
      await this.prisma.pushSubscription.updateMany({
        where: { endpoint: deviceToken },
        data: { disabledAt: new Date() }
      });
    } catch (error) {
      this.logger.error('Error disabling push subscription:', error);
    }
  }

  /**
   * Send push notification to user using Firebase Cloud Messaging
   * @param userId User ID
   * @param payload Notification payload
   */
  async sendToUser(userId: string, payload: { title: string; body: string; data?: Record<string, string>; imageUrl?: string }): Promise<boolean> {
    try {
      const subs = await this.prisma.pushSubscription.findMany({
        where: { userId, disabledAt: null },
      });

      if (!subs.length) {
        this.logger.warn(`No active subscriptions found for user ${userId}`);
        return false;
      }

      let deliveredAny = false;

      for (const sub of subs) {
        try {
          const message: admin.messaging.Message = {
            notification: {
              title: payload.title,
              body: payload.body,
              imageUrl: payload.imageUrl || undefined,
            },
            data: payload.data || {},
            token: sub.endpoint, // FCM device token
          };

          this.logger.debug(`Sending notification to token: ${sub.endpoint.substring(0, 20)}...`);

          const response = await admin.messaging().send(message);
          deliveredAny = true;

          await this.prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastSuccessAt: new Date() },
          });

          this.logger.log(`Notification sent successfully: ${response}`);
        } catch (error: any) {
          this.logger.error(`Error sending notification to device ${sub.id} (token: ${sub.endpoint.substring(0, 20)}...):`, error);

          // If token is invalid, disable the subscription
          if (
            error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/registration-token-not-registered' ||
            error?.codePrefix === 'messaging' && error?.message?.includes('not a valid FCM registration token')
          ) {
            this.logger.warn(`Disabling invalid push subscription ${sub.id}`);
            await this.prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { disabledAt: new Date() },
            });
          }
        }
      }

      return deliveredAny;
    } catch (error) {
      this.logger.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   * @param userIds Array of user IDs
   * @param payload Notification payload
   */
  async sendToMultipleUsers(
    userIds: string[],
    payload: { title: string; body: string; data?: Record<string, string>; imageUrl?: string },
  ): Promise<number> {
    let successCount = 0;

    for (const userId of userIds) {
      const success = await this.sendToUser(userId, payload);
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * Send notification to topic (supports wildcards in FCM)
   * @param topic Topic name
   * @param payload Notification payload
   */
  async sendToTopic(
    topic: string,
    payload: { title: string; body: string; data?: Record<string, string>; imageUrl?: string },
  ): Promise<string> {
    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl || undefined,
        },
        data: payload.data || {},
        topic: topic,
      };

      const response = await admin.messaging().send(message as any);
      this.logger.log(`Message sent to topic ${topic}: ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`Error sending message to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe user to a topic
   * @param userIds User IDs to subscribe
   * @param topic Topic name
   */
  async subscribeToTopic(userIds: string[], topic: string): Promise<void> {
    try {
      const subs = await this.prisma.pushSubscription.findMany({
        where: { userId: { in: userIds }, disabledAt: null },
      });

      const tokens = subs.map((s) => s.endpoint);

      if (tokens.length > 0) {
        await admin.messaging().subscribeToTopic(tokens, topic);
        this.logger.log(`Subscribed ${tokens.length} devices to topic: ${topic}`);
      }
    } catch (error) {
      this.logger.error(`Error subscribing to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from a topic
   * @param userIds User IDs to unsubscribe
   * @param topic Topic name
   */
  async unsubscribeFromTopic(userIds: string[], topic: string): Promise<void> {
    try {
      const subs = await this.prisma.pushSubscription.findMany({
        where: { userId: { in: userIds }, disabledAt: null },
      });

      const tokens = subs.map((s) => s.endpoint);

      if (tokens.length > 0) {
        await admin.messaging().unsubscribeFromTopic(tokens, topic);
        this.logger.log(`Unsubscribed ${tokens.length} devices from topic: ${topic}`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing from topic ${topic}:`, error);
      throw error;
    }
  }
}