import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AppTokenGuard } from 'src/auth/app-token.guard';
import { Menu } from 'src/auth/menu.decorator';
import { LogsService } from './logs.service';

@Controller('logs')
@UseGuards(AppTokenGuard)
@Menu('log')
export class LogsController {
    constructor(private readonly logsService: LogsService) { }

    @Get()
    async list(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('userId') userId?: string,
        @Query('route') route?: string,
        @Query('statusCode') statusCode?: string,
        @Query('createdFrom') createdFrom?: string,
        @Query('createdTo') createdTo?: string,
        @Query('seen') seen?: string,
    ) {
        const p = page ? parseInt(page, 10) : undefined;
        const ps = pageSize ? parseInt(pageSize, 10) : undefined;
        const sc = statusCode ? parseInt(statusCode, 10) : undefined;
        const seenFlag = typeof seen !== 'undefined' ? (seen === '1' || seen === 'true') : undefined;

        return this.logsService.findAll({ page: p, pageSize: ps, userId, route, statusCode: sc, createdFrom, createdTo, seen: seenFlag });
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.logsService.findOne(id);
    }

    @Post(':id/seen')
    async markSeen(@Param('id') id: string) {
        return this.logsService.markAsSeen(id);
    }
}
