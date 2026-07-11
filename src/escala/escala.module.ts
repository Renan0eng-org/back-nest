import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { EscalaController } from './escala.controller';
import { EscalaService } from './escala.service';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [EscalaController],
    providers: [EscalaService],
    exports: [EscalaService],
})
export class EscalaModule { }
