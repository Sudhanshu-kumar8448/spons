import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { BullMQConfig } from './config/bullmq.config';
import { ALL_QUEUES } from './constants';
import { ProposalJobProducer, VerificationJobProducer } from './producers';

/**
 * QueueModule — registers all BullMQ queues and job producers.
 *
 * Responsibilities:
 *  - Provides a shared Redis connection config for ALL queues
 *  - Registers each queue declared in ALL_QUEUES
 *  - Hosts job producers (event listeners that enqueue jobs)
 *  - Exports queue tokens so other modules can inject them if needed
 *
 * Producers live here because they need queue injection (@InjectQueue).
 * They listen to domain events via @OnEvent() and enqueue BullMQ jobs.
 */
@Module({
  imports: [
    // Shared connection config — used by every queue
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const bullmq = configService.get<BullMQConfig>('bullmq')!;
        return {
          connection: {
            host: bullmq.host,
            port: bullmq.port,
            password: bullmq.password,
            db: bullmq.db,
            tls: bullmq.tls,
          },
          prefix: bullmq.prefix,
        };
      },
      inject: [ConfigService],
    }),

    // Register each queue
    ...ALL_QUEUES.map((name) => BullModule.registerQueue({ name })),
  ],
  providers: [ProposalJobProducer, VerificationJobProducer],
  exports: [BullModule],
})
export class QueueModule { }
