import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(opts: {
    page?: number;
    pageSize?: number;
    userId?: string;
    route?: string;
    statusCode?: number;
    createdFrom?: string | Date;
    createdTo?: string | Date;
    seen?: boolean;
  }) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

    const where: any = {};
    if (opts.userId) where.userId = opts.userId;
    if (opts.route) where.route = { contains: opts.route };
    if (typeof opts.statusCode !== 'undefined') where.statusCode = opts.statusCode;
    // date range filter
    if (opts.createdFrom || opts.createdTo) {
      where.createdAt = {};
      if (opts.createdFrom) {
        const rawFrom = opts.createdFrom instanceof Date ? opts.createdFrom : new Date(opts.createdFrom as string);
        if (!isNaN(rawFrom.getTime())) {
          // normalize to start of day (00:00:00.000) local time
          const fromStart = new Date(rawFrom.getFullYear(), rawFrom.getMonth(), rawFrom.getDate(), 0, 0, 0, 0);
          where.createdAt.gte = fromStart;
        }
      }
      if (opts.createdTo) {
        const rawTo = opts.createdTo instanceof Date ? opts.createdTo : new Date(opts.createdTo as string);
        if (!isNaN(rawTo.getTime())) {
          // normalize to end of day (23:59:59.999) local time
          const toEnd = new Date(rawTo.getFullYear(), rawTo.getMonth(), rawTo.getDate(), 23, 59, 59, 999);
          where.createdAt.lte = toEnd;
        }
      }
    }

    // seen filter (true|false)
    if (typeof opts.seen !== 'undefined') {
      where.seen = opts.seen;
    }

    const [total, data] = await Promise.all([
      this.prisma.errorLog.count({ where }),
      this.prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
            user: {
                select: {
                idUser: true,
                name: true,
                email: true,
                },
            },
        },
      }),
    ]);

    return { total, page, pageSize, data };
  }

  async findOne(id: string) {
    const log = await this.prisma.errorLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Log não encontrado');
    return log;
  }

  async markAsSeen(id: string) {
    const log = await this.prisma.errorLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Log não encontrado');
    const updated = await this.prisma.errorLog.update({ where: { id }, data: { seen: !log.seen } });
    return { id: updated.id, seen: updated.seen };
  }
}
