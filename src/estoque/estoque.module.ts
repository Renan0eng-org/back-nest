import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { EstoqueController } from './estoque.controller';
import { EstoqueService } from './estoque.service';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [EstoqueController],
    providers: [EstoqueService],
    exports: [EstoqueService],
})
export class EstoqueModule { }
