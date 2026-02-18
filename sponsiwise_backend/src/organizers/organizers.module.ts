import { Module } from '@nestjs/common';
import { OrganizersController } from './organizers.controller';
import { OrganizerService } from './organizer.service';
import { OrganizerRepository } from './organizer.repository';
import { PrismaService } from '../common/providers';

@Module({
  controllers: [OrganizersController],
  providers: [OrganizerService, OrganizerRepository, PrismaService],
  exports: [OrganizerService, OrganizerRepository],
})
export class OrganizersModule {}
