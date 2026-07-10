import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { Menu } from 'src/auth/menu.decorator';
import { RefreshTokenGuard } from 'src/auth/refresh-token.guard';
import { AddMembrosDto, CreateGrupoDto, UpdateGrupoDto } from './dto/grupo.dto';
import { GruposService } from './grupos.service';

@Controller('admin/grupos')
@UseGuards(RefreshTokenGuard)
@Menu('grupos')
export class GruposController {
    constructor(private readonly gruposService: GruposService) { }

    @Get()
    findAll() {
        return this.gruposService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.gruposService.findOne(id);
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true }))
    create(@Body() dto: CreateGrupoDto, @Req() req: Request) {
        const creatorId = (req.user as any)?.idUser;
        return this.gruposService.create(dto, creatorId);
    }

    @Put(':id')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGrupoDto) {
        return this.gruposService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.gruposService.remove(id);
    }

    @Post(':id/membros')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    addMembros(@Param('id', ParseIntPipe) id: number, @Body() dto: AddMembrosDto) {
        return this.gruposService.addMembros(id, dto.userIds);
    }

    @Delete(':id/membros/:userId')
    removeMembro(@Param('id', ParseIntPipe) id: number, @Param('userId') userId: string) {
        return this.gruposService.removeMembro(id, userId);
    }
}
