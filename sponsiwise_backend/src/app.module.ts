import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig, redisConfig, jwtConfig } from './common/config';
import bullmqConfig from './jobs/config/bullmq.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { CompaniesModule } from './companies/companies.module';
import { OrganizersModule } from './organizers/organizers.module';
import { EventsModule } from './events/events.module';
import { SponsorshipsModule } from './sponsorships/sponsorships.module';
import { ProposalsModule } from './proposals/proposals.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { PublicModule } from './public/public.module';
import { SponsorModule } from './sponsor/sponsor.module';
import { OrganizerDashboardModule } from './organizer-dashboard/organizer-dashboard.module';
import { ManagerDashboardModule } from './manager-dashboard/manager-dashboard.module';
import { AdminModule } from './admin/admin.module';
import { CacheModule } from './cache/cache.module';
import { QueueModule, WorkerModule } from './jobs';
import { EmailLogsModule } from './email-logs/email-logs.module';
import { ManagerLifecycleModule } from './manager-lifecycle/manager-lifecycle.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CompanyLifecycleModule } from './company-lifecycle/company-lifecycle.module';
import { HealthModule } from './health/health.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, redisConfig, jwtConfig, bullmqConfig],
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,  // 60 seconds
          limit: 60,   // 60 requests per minute (global baseline)
        },
      ],
    }),
    CacheModule,
    QueueModule,
    WorkerModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    CompaniesModule,
    OrganizersModule,
    EventsModule,
    SponsorshipsModule,
    ProposalsModule,
    AuditLogsModule,
    PublicModule,
    SponsorModule,
    OrganizerDashboardModule,
    ManagerDashboardModule,
    AdminModule,
    EmailLogsModule,
    ManagerLifecycleModule,
    NotificationsModule,
    CompanyLifecycleModule,
    OnboardingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
