import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Menu } from 'src/auth/menu.decorator';
import { RefreshTokenGuard } from 'src/auth/refresh-token.guard';
import { CreateMedicoDto, UpdateMedicoDto } from './dto/medico.dto';
import { MedicosService } from './medicos.service';

@Controller('admin/medicos')
@UseGuards(RefreshTokenGuard)
@Menu('medicos')
export class MedicosController {
    constructor(private readonly medicosService: MedicosService) { }

    @Get()
    findAll() {
        return this.medicosService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.medicosService.findOne(id);
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true }))
    create(@Body() dto: CreateMedicoDto) {
        return this.medicosService.create(dto);
    }

    @Put(':id')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    update(@Param('id') id: string, @Body() dto: UpdateMedicoDto) {
        return this.medicosService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.medicosService.remove(id);
    }
}
