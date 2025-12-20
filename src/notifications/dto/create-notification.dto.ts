export class TargetsDto {
  userIds?: string[];
  roles?: string[];
  filters?: Record<string, any>;
}

export class CreateNotificationDto {
  title!: string;
  body?: string;
  data?: Record<string, any>;
  category?: string;
  priority?: number;
  targets?: TargetsDto;
  sendPush?: boolean;
}