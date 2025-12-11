import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { Menu } from 'src/auth/menu.decorator';
import { RefreshTokenGuard } from 'src/auth/refresh-token.guard';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
@UseGuards(RefreshTokenGuard)
@Menu('paciente')
export class PatientsController {
    constructor(private readonly patientsService: PatientsService, private readonly authService: AuthService) { }

    @Get()
    findAll(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('name') name?: string,
        @Query('email') email?: string,
        @Query('cpf') cpf?: string,
        @Query('birthDateFrom') birthDateFrom?: string,
        @Query('birthDateTo') birthDateTo?: string,
        @Query('sexo') sexo?: string,
        @Query('unidadeSaude') unidadeSaude?: string,
        @Query('medicamentos') medicamentos?: string,
        @Query('exames') exames?: string,
        @Query('examesDetalhes') examesDetalhes?: string,
        @Query('alergias') alergias?: string,
        @Query('active') active?: string,
    ) {
        const p = page ? parseInt(page, 10) : undefined;
        const ps = pageSize ? parseInt(pageSize, 10) : undefined;

        const filters: any = {};
        if (name) filters.name = name;
        if (email) filters.email = email;
        if (cpf) filters.cpf = cpf;
        if (birthDateFrom) filters.birthDateFrom = birthDateFrom;
        if (birthDateTo) filters.birthDateTo = birthDateTo;
        if (sexo && sexo !== 'all') filters.sexo = sexo;
        if (unidadeSaude) filters.unidadeSaude = unidadeSaude;
        if (medicamentos) filters.medicamentos = medicamentos;
        if (typeof exames !== 'undefined') {
            if (exames === 'true') filters.exames = true;
            else if (exames === 'false') filters.exames = false;
        }
        if (examesDetalhes) filters.examesDetalhes = examesDetalhes;
        if (alergias) filters.alergias = alergias;
        if (typeof active !== 'undefined') {
            if (active === 'true') filters.active = true;
            else if (active === 'false') filters.active = false;
        }

        return this.patientsService.findAll(p || ps ? { page: p, pageSize: ps, filters } : { filters } as any);
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
    async remove(@Param('id') id: string, @Req() req: Request) {
        let token: string | undefined = undefined;
        let tokenType: 'access' | 'refresh' | 'any' = 'any';

        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
            tokenType = 'access';
        } else if ((req as any).cookies && (req as any).cookies['refresh_token']) {
            token = (req as any).cookies['refresh_token'];
            tokenType = 'refresh';
        }

        if (!token) throw new UnauthorizedException('Token não fornecido.');

        const validation = await this.authService.validateToken(token, { type: tokenType }) as any;
        const dataToken = validation?.dataToken || {};
        const deleterId = dataToken.sub || dataToken.idUser || dataToken.id;

        return this.patientsService.remove(id, deleterId);
    }
}
