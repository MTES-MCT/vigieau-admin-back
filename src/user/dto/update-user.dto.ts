import { IsArray, IsNotEmpty, IsString, Matches, ValidateIf, ValidateNested } from 'class-validator';
import { UserRole } from '../type/user-role.type';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @IsString()
  @Matches(/^mte$|^departement$/)
  @IsNotEmpty()
  @ApiProperty({
    example: 'departement',
    enum: ['mte', 'departement'],
    description: 'Rôle de l\'utilisateur',
  })
  role: UserRole;

  @ValidateIf((o) => o.role === 'departement')
  @IsArray()
  @IsNotEmpty()
  @Matches('^([0|2][1-9]|[1|3-8][0-9]|9[0-5]|97[1-4]|2[AB]|976)$', undefined, { each: true })
  @ApiProperty({
    example: '["01"]',
    description:
      'Départements associés à l\'utilisateur lorsque son rôle n\'est pas MTE',
  })
  roleDepartements: string[];
}
