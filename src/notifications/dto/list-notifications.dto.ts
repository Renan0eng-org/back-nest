export class ListNotificationsQuery {
  status?: 'UNREAD' | 'READ' | 'ARCHIVED';
  limit?: number;
  after?: string; // base64 cursor
  category?: string;
}