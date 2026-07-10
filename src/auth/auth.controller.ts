import { BadRequestException, Body, Controller, Get, Patch, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from 'src/auth/public.decorator';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';

function cookieOptions(): { httpOnly: boolean; secure: boolean; sameSite: 'lax'; path: string; maxAge: number; domain?: string } {
    const opts: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
    if (process.env.COOKIE_DOMAIN) {
        opts.domain = process.env.COOKIE_DOMAIN;
    }
    return opts;
}

function clearCookieOptions(): { httpOnly: boolean; secure: boolean; sameSite: 'lax'; path: string; domain?: string } {
    const opts: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
    };
    if (process.env.COOKIE_DOMAIN) {
        opts.domain = process.env.COOKIE_DOMAIN;
    }
    return opts;
}

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @Public()
    async register(@Body() data: RegisterUserDto) {
        return this.authService.createUserMobile(data);
    }

    @Post('register-web')
    @Public()
    async registerWeb(@Body() data: RegisterUserDto) {
        return this.authService.createUser({ ...data, type: 'USUARIO' } as any);
    }

    @Post('login')
    @Public()
    async login(@Body() data: LoginUserDto) {
        if (!data.cpf) {
            throw new BadRequestException('CPF é obrigatório para login padrão');
        }

        const user = await this.authService.validateUser(data.cpf, data.password, true);
        const payload: any = { sub: user.idUser, email: user.email, cpf: user.cpf };

        if (!user.active) {
            payload.preApproval = true;
        }

        const access_token = await this.authService.login({ idUser: user.idUser, email: user.email, cpf: user.cpf });
        return { access_token, user: { ...user, active: user.active } };
    }

    @Post('login-web')
    async loginWeb(
        @Body() data: LoginUserDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        if (!data.email) {
            throw new BadRequestException('Email é obrigatório para login web');
        }

        const user = await this.authService.validateUserWeb(data.email, data.password);

        const { accessToken, refreshToken } = await this.authService.loginWeb({
            idUser: user.idUser,
            email: user.email,
        });

        response.cookie('refresh_token', refreshToken, cookieOptions());

        return {
            accessToken,
            user: user
        };
    }

    @Post('logout-web')
    async logout(@Res({ passthrough: true }) response: Response) {
        response.clearCookie('refresh_token', clearCookieOptions());

        return { message: 'Logout realizado com sucesso' };
    }

    @Post('refresh')
    async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        try {
            const token = request.cookies['refresh_token'];
            if (!token) {
                throw new UnauthorizedException('Nenhuma sessão encontrada.');
            }

            const { accessToken, refreshToken } = await this.authService.refreshToken(token);

            response.cookie('refresh_token', refreshToken, cookieOptions());

            return { accessToken };

        } catch (err) {
            response.clearCookie('refresh_token', clearCookieOptions());
            if (err instanceof UnauthorizedException) {
                throw err;
            }
            throw new UnauthorizedException('Sessão inválida ou expirada.');
        }
    }

    @Get('me')
    async me(@Req() request: Request) {
        const token = request.cookies['refresh_token'];
        if (!token) throw new UnauthorizedException('Token não fornecido');

        const dataToken = await this.authService.validateToken(token, { type: 'refresh' });

        const user = await this.authService.findUserById(dataToken.dataToken.sub);

        return user;
    }

    @Post('validate')
    async validate(@Body('token') token: string) {
        return this.authService.validateToken(token);
    }

    @Patch('profile')
    async updateProfile(
        @Req() request: Request,
        @Body() data: { name?: string; email?: string; phone?: string; cep?: string; cpf?: string },
    ) {
        const token = request.cookies['refresh_token'];
        if (!token) throw new UnauthorizedException('Token não fornecido');

        const dataToken = await this.authService.validateToken(token, { type: 'refresh' });
        return this.authService.updateProfile(dataToken.dataToken.sub, data);
    }

    @Post('change-password')
    async changePassword(
        @Req() request: Request,
        @Body() data: { currentPassword: string; newPassword: string },
    ) {
        const token = request.cookies['refresh_token'];
        if (!token) throw new UnauthorizedException('Token não fornecido');

        if (!data.currentPassword || !data.newPassword) {
            throw new BadRequestException('Senha atual e nova senha são obrigatórias.');
        }
        if (data.newPassword.length < 6) {
            throw new BadRequestException('A nova senha deve ter no mínimo 6 caracteres.');
        }

        const dataToken = await this.authService.validateToken(token, { type: 'refresh' });
        return this.authService.changePassword(dataToken.dataToken.sub, data.currentPassword, data.newPassword);
    }

    @Post('forgot-password')
    @Public()
    async forgotPassword(@Body('email') email: string) {
        if (!email) throw new BadRequestException('E-mail é obrigatório.');
        return this.authService.forgotPassword(email);
    }

    @Post('reset-password')
    @Public()
    async resetPassword(@Body() data: { token: string; password: string }) {
        if (!data.token || !data.password) {
            throw new BadRequestException('Token e nova senha são obrigatórios.');
        }
        if (data.password.length < 6) {
            throw new BadRequestException('A senha deve ter no mínimo 6 caracteres.');
        }
        return this.authService.resetPassword(data.token, data.password);
    }
}
