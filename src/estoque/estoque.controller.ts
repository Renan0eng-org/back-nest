import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { Menu } from 'src/auth/menu.decorator';
import { RefreshTokenGuard } from 'src/auth/refresh-token.guard';
import { CreateSupplyDto, MovimentacaoDto, UpdateSupplyDto } from './dto/estoque.dto';
import { EstoqueService } from './estoque.service';

@Controller('admin/estoque')
@UseGuards(RefreshTokenGuard)
@Menu('estoque')
export class EstoqueController {
    constructor(private readonly estoqueService: EstoqueService) { }

    @Get()
    findAll(@Query('grupoId') grupoId?: string, @Query('deleted') deleted?: string) {
        return this.estoqueService.findAll(grupoId ? Number(grupoId) : undefined, deleted === 'true');
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.estoqueService.findOne(id);
    }

    @Get(':id/movimentacoes')
    movimentacoes(@Param('id') id: string) {
        return this.estoqueService.movimentacoes(id);
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true }))
    create(@Body() dto: CreateSupplyDto) {
        return this.estoqueService.create(dto);
    }

    @Put(':id')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    update(@Param('id') id: string, @Body() dto: UpdateSupplyDto) {
        return this.estoqueService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.estoqueService.remove(id);
    }

    @Post(':id/restaurar')
    restore(@Param('id') id: string) {
        return this.estoqueService.restore(id);
    }

    @Post(':id/movimentar')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    movimentar(@Param('id') id: string, @Body() dto: MovimentacaoDto, @Req() req: Request) {
        const userId = (req.user as any)?.idUser;
        return this.estoqueService.movimentar(id, dto, userId);
    }
}
