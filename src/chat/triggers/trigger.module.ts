import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { FormModule } from 'src/forms/form.module';
import { TriggerDbService } from './trigger-db.service';
import { TriggerLogsBus } from './trigger-logs.bus';
import { TriggerController } from './trigger.controller';
import { TriggerService } from './trigger.service';
import { DefaultTrigger } from './triggers/default.trigger';
import { DocumentationTrigger } from './triggers/documentation.trigger';
import { FormTrigger } from './triggers/form.trigger';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    forwardRef(() => FormModule),
  ],
  controllers: [TriggerController],
  providers: [
    TriggerDbService,
    TriggerService,
    FormTrigger,
    DocumentationTrigger,
    DefaultTrigger,
    TriggerLogsBus,
  ],
  exports: [TriggerService, TriggerDbService, TriggerLogsBus],
})
export class TriggerModule {}
