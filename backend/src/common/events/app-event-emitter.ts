import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export const SALE_COMPLETED = 'SALE_COMPLETED';

@Injectable()
export class AppEventEmitter extends EventEmitter {
  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}
