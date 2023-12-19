import { IsBoolean, IsObject, IsString } from 'class-validator';
import { UsageDto } from '../../usage/dto/usage.dto';

export class UsageArreteCadreDto {
  @IsObject()
  usage: UsageDto;

  @IsBoolean()
  concerneParticulier: boolean;

  @IsBoolean()
  concerneEntreprise: boolean;

  @IsBoolean()
  concerneCollectivite: boolean;

  @IsBoolean()
  concerneExploitation: boolean;

  @IsString()
  descriptionVigilance: string;

  @IsString()
  descriptionAlerte: string;

  @IsString()
  descriptionAlerteRenforcee: string;

  @IsString()
  descriptionCrise: string;
}