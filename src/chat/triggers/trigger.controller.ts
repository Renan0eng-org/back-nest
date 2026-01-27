import {
    Body,
    Controller,
    Delete,
    Get,
    MessageEvent,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Sse,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { interval, map, merge, Observable } from 'rxjs';
import { AppTokenGuard } from 'src/auth/app-token.guard';
import { Menu } from 'src/auth/menu.decorator';
import { CreateAgentDto, CreateTriggerDto, UpdateAgentDto, UpdateTriggerDto } from './dto/trigger.dto';
import { TriggerDbService } from './trigger-db.service';
import { TriggerLogsBus } from './trigger-logs.bus';
@Controller('triggers')
@UseGuards(AppTokenGuard)
@Menu('chat-ai-admin')
export class TriggerController {
    constructor(
        private readonly triggerDbService: TriggerDbService,
        private readonly logsBus: TriggerLogsBus
    ) { }

    @Get('agents')
    async listAgents() {
        return this.triggerDbService.listAgents();
    }

    @Get('agents/default')
    async getDefaultAgent() {
        const agent = await this.triggerDbService.getDefaultAgent();
        if (!agent) throw new NotFoundException('Nenhum agente padrão encontrado');
        return agent;
    }

    @Get('agents/:id')
    async getAgent(@Param('id') id: string) {
        return this.triggerDbService.getAgent(id);
    }

    @Post('agents')
    @UsePipes(new ValidationPipe())
    async createAgent(@Body() dto: CreateAgentDto) {
        return this.triggerDbService.createAgent(dto);
    }

    @Patch('agents/:id')
    @UsePipes(new ValidationPipe())
    async updateAgent(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
        return this.triggerDbService.updateAgent(id, dto);
    }

    @Delete('agents/:id')
    async deleteAgent(@Param('id') id: string) {
        return this.triggerDbService.deleteAgent(id);
    }

    @Get()
    async listTriggers(@Query('agentId') agentId?: string) {
        return this.triggerDbService.listTriggers(agentId);
    }

    @Get('stats')
    async getStats(@Query('agentId') agentId?: string) {
        return this.triggerDbService.getStats(agentId);
    }

    @Get(':id')
    async getTrigger(@Param('id') id: string) {
        return this.triggerDbService.getTrigger(id);
    }

    @Post()
    @UsePipes(new ValidationPipe())
    async createTrigger(@Body() dto: CreateTriggerDto) {
        return this.triggerDbService.createTrigger(dto);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe())
    async updateTrigger(@Param('id') id: string, @Body() dto: UpdateTriggerDto) {
        return this.triggerDbService.updateTrigger(id, dto);
    }

    @Post(':id/toggle')
    async toggleTrigger(@Param('id') id: string) {
        return this.triggerDbService.toggleTrigger(id);
    }

    @Delete(':id')
    async deleteTrigger(@Param('id') id: string) {
        return this.triggerDbService.deleteTrigger(id);
    }

    @Post('test')
    @UsePipes(new ValidationPipe())
    async testMessage(@Body() body: { message: string; history?: any[]; agentId?: string }) {
        const result = await this.triggerDbService.detectTrigger(
            body.message,
            body.history,
            body.agentId
        );

        this.logsBus.emit(
            `[TriggerController] Teste: "${body.message.substring(0, 50)}..." -> ${result.trigger?.name || 'Nenhuma'} (score: ${result.score})`
        );

        return {
            trigger: result.trigger
                ? {
                    id: result.trigger.id,
                    triggerId: result.trigger.triggerId,
                    name: result.trigger.name,
                }
                : null,
            score: result.score,
            stackedTriggers: result.stackedTriggers?.map((t: any) => ({
                id: t.id,
                triggerId: t.triggerId,
                name: t.name,
            })),
        };
    }


    @Sse('logs/stream')
    streamLogs(): Observable<MessageEvent> {
        const heartbeat$ = interval(30000).pipe(
            map(() => ({
                data: JSON.stringify({
                    type: 'heartbeat',
                    timestamp: new Date().toISOString(),
                }),
            }))
        );

        const logs$ = this.logsBus.logs$.pipe(
            map((log) => ({
                data: JSON.stringify({
                    type: 'log',
                    message: log,
                    timestamp: new Date().toISOString(),
                }),
            }))
        );

        setTimeout(() => {
            this.logsBus.emit('[TriggerController] Cliente conectado ao stream de logs');
        }, 100);

        return merge(logs$, heartbeat$);
    }

}
