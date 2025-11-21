import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Menu } from 'src/auth/menu.decorator';
import { RefreshTokenGuard } from 'src/auth/refresh-token.guard';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
@UseGuards(RefreshTokenGuard)
@Menu('paciente')
export class PatientsController {
    constructor(private readonly patientsService: PatientsService) { }

    @Get()
    findAll() {
        return this.patientsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.patientsService.findOne(id);
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true }))
    create(@Body() dto: RegisterPatientDto) {
        const createData: any = {
            email: dto.email,
            password: dto.password,
            name: dto.name,
        };
        if (dto.cpf) createData.cpf = dto.cpf;
        if (dto.birthDate) createData.birthDate = new Date(dto.birthDate);
        if (dto.sexo) createData.sexo = dto.sexo;
        if (dto.unidadeSaude) createData.unidadeSaude = dto.unidadeSaude;
        if (dto.medicamentos) createData.medicamentos = dto.medicamentos;
        if (typeof dto.exames !== 'undefined') createData.exames = dto.exames;
        if (dto.examesDetalhes) createData.examesDetalhes = dto.examesDetalhes;
        if (dto.alergias) createData.alergias = dto.alergias;

        return this.patientsService.create(createData);
    }

    @Put(':id')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
        const updateData: any = { ...dto };
        if (dto.birthDate) updateData.birthDate = new Date(dto.birthDate);
        return this.patientsService.update(id, updateData);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.patientsService.remove(id);
    }
}
