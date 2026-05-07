import { Global, Module } from '@nestjs/common';
import { AppEventEmitter } from './app-event-emitter';

@Global()
@Module({
  providers: [AppEventEmitter],
  exports: [AppEventEmitter],
})
export class EventsModule {}
