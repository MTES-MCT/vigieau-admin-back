import { IsNumber, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FichierDto } from '../../fichier/dto/fichier.dto';
import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { ArreteMunicipal } from '../entities/arrete_municipal.entity';

export class ArreteMunicipalDto {
  @IsNumber()
  @ApiProperty({ example: 1, description: 'Identifiant BDD' })
  id: number;

  @IsString()
  @ApiProperty({
    example: '01/01/2024',
    description: "Date de début de validité de l'arrêté cadre",
  })
  dateDebut: string;

  @IsString()
  @ApiProperty({
    example: '31/12/2024',
    description: "Date de fin de validité de l'arrêté cadre",
  })
  dateFin: string;

  @IsString()
  @ApiProperty({ example: 'John', description: 'Prénom de l\'utilisateur qui a crée l\'arrêté municipal' })
  userFirstName: string;

  @IsString()
  @ApiProperty({ example: 'Doe', description: 'Nom de l\'utilisateur qui a crée l\'arrêté municipal' })
  userLastName: string;

  @IsString()
  @ApiProperty({ example: 'john.doe@example.com', description: 'Email de l\'utilisateur qui a crée l\'arrêté municipal' })
  userEmail: string;

  @IsObject()
  @ApiProperty({ type: FichierDto })
  fichier: FichierDto;
}

export const arreteMunicipalPaginateConfig: PaginateConfig<ArreteMunicipal> =
  {
    select: [
      'id',
      'statut',
      'dateDebut',
      'dateFin',
      'statut',
      'userFirstName',
      'userLastName',
      'userEmail',
      'communes.id',
      'communes.code',
      'communes.nom',
      'fichier.id',
      'fichier.nom',
      'fichier.url',
      'fichier.size',
    ],
    sortableColumns: [
      'dateDebut',
      'communes.code'
    ],
    defaultSortBy: [
      ['dateDebut', 'DESC'],
      ['communes.code', 'ASC']
    ],
    nullSort: 'first',
    relations: [
      'communes',
      'communes.departement',
      'fichier',
    ],
    searchableColumns: [],
    filterableColumns: {
      statut: [FilterOperator.IN],
      'communes.code': [FilterOperator.IN],
      'communes.departement.code': [FilterOperator.IN],
    },
  };