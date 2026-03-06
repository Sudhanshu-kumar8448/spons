import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliverableRowDto } from './create-deliverable-form.dto';

export class CreateDeliverableTemplateDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliverableRowDto)
  rows!: DeliverableRowDto[];
}

export class UpdateDeliverableTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliverableRowDto)
  rows?: DeliverableRowDto[];
}
