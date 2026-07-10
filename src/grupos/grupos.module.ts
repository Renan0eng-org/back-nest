import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [GruposController],
    providers: [GruposService],
    exports: [GruposService],
})
export class GruposModule { }
