import { Body, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { AppTokenGuard } from 'src/auth/app-token.guard';
import { AuthService } from 'src/auth/auth.service';
import { SaveFormDto } from './dto/save-form.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { FormService } from './form.service';

@Controller('forms')
@UseGuards(AppTokenGuard)
export class FormController {
    constructor(
        private readonly formService: FormService,
        private readonly authService: AuthService,
    ) { }

    @Get()
    findAll() {
        return this.formService.findAll();
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true }))
    create(@Body() dto: SaveFormDto) {
        return this.formService.create(dto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.formService.findOne(id);
    }

    @Put(':id')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    update(@Param('id') id: string, @Body() dto: SaveFormDto) {
        return this.formService.update(id, dto);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.formService.delete(id);
    }

    @Post(':id/responses')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async submitResponse(@Param('id') id: string, @Body() dto: SubmitResponseDto, @Req() request: Request) {
        const authHeader = request.headers.authorization
        const refreshToken = request.cookies['refresh_token']

        if (!authHeader && !refreshToken) throw new UnauthorizedException('Token não fornecido')
        if (authHeader && !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Token malformado')
        }

        const tokenBearer = authHeader?.split(' ')[1]
        const token = refreshToken || tokenBearer;

        const dataToken = await this.authService.validateToken(token)
        if (!dataToken) throw new UnauthorizedException('Token inválido')

        const userId = dataToken.dataToken.sub

        return this.formService.submitResponse(id, dto, userId);
    }

    @Get(':id/responses')
    findResponses(@Param('id') id: string) {
        return this.formService.findResponses(id);
    }

    @Get('/responses/list')
    findAllResponses() {
        return this.formService.findAllResponses();
    }

    @Get('response/:responseId')
    findResponseDetail(@Param('responseId') id: string) {
        return this.formService.findResponseDetail(id);
    }

    @Get('/users/toAssign')
    getUsersToAssign() {
        return this.formService.getUsersToAssign();
    }

    @Get(':id/assigned')
    getAssignedUsers(@Param('id') id: string) {
        return this.formService.getAssignedUsers(id);
    }

    @Post(':id/assign')
    assignUsers(
        @Param('id') id: string,
        @Body('userIds') userIds: string[],
    ) {
        return this.formService.assignUsers(id, userIds);
    }

    @Get('/user/my')
    async getMyForms(@Req() request: Request) {
        const authHeader = request.headers.authorization
        const refreshToken = request.cookies['refresh_token']

        if (!authHeader && !refreshToken) throw new UnauthorizedException('Token não fornecido')
        if (authHeader && !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Token malformado')
        }

        const tokenBearer = authHeader?.split(' ')[1]

        const token = refreshToken || tokenBearer;

        const dataToken = await this.authService.validateToken(token)

        if (!dataToken) throw new UnauthorizedException('Token inválido')

        const forms = await this.formService.getMyForms(dataToken.dataToken.sub);

        if (!forms) throw new UnauthorizedException('Usuário não encontrado')

        return forms;
    }
}
