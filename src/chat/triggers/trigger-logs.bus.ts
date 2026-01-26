import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class TriggerLogsBus {
  logs$ = new Subject<string>();

  emit(message: string) {
    this.logs$.next(message);
  }
}
