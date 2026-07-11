import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { MedicosController } from './medicos.controller';
import { MedicosService } from './medicos.service';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [MedicosController],
    providers: [MedicosService],
    exports: [MedicosService],
})
export class MedicosModule { }
