import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS?.replace(/^["']|["']$/g, '');

    this.logger.log(`SMTP config → host=${host}, port=${port}, user=${user}, pass=${pass ? '***' + pass.slice(-4) : 'EMPTY'}`);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendPasswordReset(to: string, name: string, token: string) {
    const frontendUrl = process.env.CORS || 'https://prefeitura.renannardi.com';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    this.logger.log(`Enviando email de recuperação para ${to}...`);

    try {
      const info = await this.transporter.sendMail({
        from: `"PVAI Sem Dor" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: 'Recuperação de Senha - PVAI Sem Dor',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #23518C, #306EBF); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">PVAI SEM DOR</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Sistema de Saúde de Paranavaí</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="color: #1a1a1a; font-size: 16px; margin: 0 0 16px;">Olá, <strong>${name}</strong>!</p>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
              </p>
              <div style="text-align: center; margin: 0 0 24px;">
                <a href="${resetUrl}" style="display: inline-block; background: #23518C; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Redefinir minha senha
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0 0 16px;">
                Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição de senha, ignore este e-mail.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                Prefeitura de Paranavaí &bull; UNIPAR
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`Email enviado com sucesso! messageId=${info.messageId}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar email para ${to}: ${err.message}`);
      this.logger.error(err.stack);
      throw err;
    }
  }

  async sendWelcome(to: string, name: string, token: string) {
    const frontendUrl = process.env.CORS || 'https://prefeitura.renannardi.com';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    this.logger.log(`Enviando email de boas-vindas para ${to}...`);

    try {
      const info = await this.transporter.sendMail({
        from: `"PVAI Sem Dor" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: 'Bem-vindo ao PVAI Sem Dor',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #23518C, #306EBF); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">PVAI SEM DOR</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Sistema de Saúde de Paranavaí</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="color: #1a1a1a; font-size: 16px; margin: 0 0 16px;">Olá, <strong>${name}</strong>!</p>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
                Bem-vindo ao sistema <strong>PVAI Sem Dor</strong>! Sua conta foi criada com sucesso.
              </p>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                Para começar a usar o sistema, clique no botão abaixo para definir sua senha de acesso:
              </p>
              <div style="text-align: center; margin: 0 0 24px;">
                <a href="${resetUrl}" style="display: inline-block; background: #23518C; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Definir minha senha
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0 0 16px;">
                Este link expira em <strong>24 horas</strong>. Se precisar de um novo link, entre em contato com o administrador do sistema.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                Prefeitura de Paranavaí &bull; UNIPAR
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`Email de boas-vindas enviado com sucesso! messageId=${info.messageId}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar email de boas-vindas para ${to}: ${err.message}`);
      this.logger.error(err.stack);
      throw err;
    }
  }
}
