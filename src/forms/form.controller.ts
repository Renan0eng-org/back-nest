import { Body, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { AppTokenGuard } from 'src/auth/app-token.guard';
import { AuthService } from 'src/auth/auth.service';
import { Menu } from 'src/auth/menu.decorator';
import { SaveFormDto } from './dto/save-form.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { FormService } from './form.service';

@Controller('forms')
@UseGuards(AppTokenGuard)
@Menu('formulario')
export class FormController {
    constructor(
        private readonly formService: FormService,
        private readonly authService: AuthService,
    ) { }

    @Get()
    findAll() {
        return this.formService.findAll();
    }

    @Get('screenings')
    findScreenings() {
        return this.formService.findScreenings();
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true }))
    create(@Body() dto: SaveFormDto) {
        return this.formService.create(dto);
    }

    @Get(':id')
    @Menu('')
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

    @Post(':id/activate-screening')
    activateScreening(@Param('id') id: string) {
        return this.formService.setScreening(id, true);
    }

    @Post(':id/deactivate-screening')
    deactivateScreening(@Param('id') id: string) {
        return this.formService.setScreening(id, false);
    }

    @Post(':id/toggle-screening')
    toggleScreening(@Param('id') id: string) {
        return this.formService.toggleScreening(id);
    }

    @Post(':id/responses')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async submitResponse(@Param('id') id: string, @Body() dto: SubmitResponseDto, @Req() request: Request) {

        // se tiver dto userId, usar ele, senão validar token
        if (!dto.userId) {
            const authHeader = request.headers.authorization
            const refreshToken = request.cookies['refresh_token']

            if (!authHeader && !refreshToken) throw new UnauthorizedException('Token não fornecido')
            if (authHeader && !authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException('Token malformado')
            }

            const tokenBearer = authHeader?.split(' ')[1]
            const token = tokenBearer || refreshToken;

            if (!token) throw new UnauthorizedException('Token inválido')

            const dataToken = await this.authService.validateToken(token, {
                type: tokenBearer ? 'access' : 'refresh',
            })
            if (!dataToken) throw new UnauthorizedException('Token inválido')

            const userId = dataToken.dataToken.sub
            return this.formService.submitResponse(id, dto, userId);
        }

        return this.formService.submitResponse(id, dto, dto.userId);
    }

    @Put(':id/responses/:responseId')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async updateResponse(@Param('id') id: string, @Param('responseId') responseId: string, @Body() dto: SubmitResponseDto, @Req() request: Request) {
        // se tiver dto userId, usar ele, senão validar token
        if (!dto.userId) {
            const authHeader = request.headers.authorization
            const refreshToken = request.cookies['refresh_token']

            if (!authHeader && !refreshToken) throw new UnauthorizedException('Token não fornecido')
            if (authHeader && !authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException('Token malformado')
            }

            const tokenBearer = authHeader?.split(' ')[1]
            const token = tokenBearer || refreshToken;

            if (!token) throw new UnauthorizedException('Token inválido')

            const dataToken = await this.authService.validateToken(token, {
                type: tokenBearer ? 'access' : 'refresh',
            })
            if (!dataToken) throw new UnauthorizedException('Token inválido')

            const userId = dataToken.dataToken.sub
            return this.formService.updateResponse(id, dto, userId, responseId);
        }

        return this.formService.updateResponse(id, dto, dto.userId, responseId);
    }

    @Delete(':id/responses/:responseId')
    async deleteResponse(@Param('id') id: string, @Param('responseId') responseId: string, @Req() request: Request) {
        const authHeader = request.headers.authorization
        const refreshToken = request.cookies['refresh_token']

        if (!authHeader && !refreshToken) throw new UnauthorizedException('Token não fornecido')
        if (authHeader && !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Token malformado')
        }

        const tokenBearer = authHeader?.split(' ')[1]
        const token = tokenBearer || refreshToken;

        if (!token) throw new UnauthorizedException('Token inválido')

        const dataToken = await this.authService.validateToken(token, {
            type: tokenBearer ? 'access' : 'refresh',
        })
        if (!dataToken) throw new UnauthorizedException('Token inválido')

        const userId = dataToken.dataToken.sub
        return this.formService.deleteResponse(id, userId, responseId);
    }

    @Get(':id/responses')
    @Menu('respostas')
    findResponses(@Param('id') id: string) {
        return this.formService.findResponses(id);
    }

    @Get('/responses/list')
    @Menu('respostas')
    findAllResponses() {
        return this.formService.findAllResponses();
    }

    @Get('response/:responseId')
    @Menu('respostas')
    findResponseDetail(@Param('responseId') id: string) {
        return this.formService.findResponseDetail(id);
    }

    @Get('/users/toAssign')
    @Menu('atribuir-usuarios')
    getUsersToAssign() {
        return this.formService.getUsersToAssign();
    }

    @Get(':id/assigned')
    @Menu('atribuir-usuarios')
    getAssignedUsers(@Param('id') id: string) {
        return this.formService.getAssignedUsers(id);
    }

    @Post(':id/assign')
    @Menu('atribuir-usuarios')
    assignUsers(
        @Param('id') id: string,
        @Body('userIds') userIds: string[],
    ) {
        return this.formService.assignUsers(id, userIds);
    }

    // remove o usuário da atribuição
    @Post(':id/unassign')
    @Menu('atribuir-usuarios')
    unassignUsers(
        @Param('id') id: string,
        @Body('userIds') userIds: string[],
    ) {
        return this.formService.unassignUsers(id, userIds);
    }

    @Get('/user/my')
    @Menu('')
    async getMyForms(@Req() request: Request) {
        const authHeader = request.headers.authorization
        const refreshToken = request.cookies['refresh_token']

        if (!authHeader && !refreshToken) throw new UnauthorizedException('Token não fornecido')
        if (authHeader && !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Token malformado')
        }

        const tokenBearer = authHeader?.split(' ')[1]

        const token = tokenBearer || refreshToken;

        if (!token) throw new UnauthorizedException('Token inválido')

        const dataToken = await this.authService.validateToken(token, {
            type: tokenBearer ? 'access' : 'refresh',
        })

        if (!dataToken) throw new UnauthorizedException('Token inválido')

        const forms = await this.formService.getMyForms(dataToken.dataToken.sub);

        if (!forms) throw new UnauthorizedException('Usuário não encontrado')

        return forms;
    }
}
