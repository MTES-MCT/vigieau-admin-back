import { forwardRef, Module } from '@nestjs/common';
import { ArreteCadreService } from './arrete_cadre.service';
import { ArreteCadreController } from './arrete_cadre.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArreteCadre } from './entities/arrete_cadre.entity';
import { UsageArreteCadreModule } from '../usage_arrete_cadre/usage_arrete_cadre.module';
import { ArreteRestrictionModule } from '../arrete_restriction/arrete_restriction.module';
import { SharedModule } from '../shared/shared.module';
import { DepartementModule } from '../departement/departement.module';
import { ZoneAlerteModule } from '../zone_alerte/zone_alerte.module';
import { UserModule } from '../user/user.module';
import { FichierModule } from '../fichier/fichier.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArreteCadre]),
    UsageArreteCadreModule,
    forwardRef(() => ArreteRestrictionModule),
    SharedModule,
    DepartementModule,
    forwardRef(() => ZoneAlerteModule),
    UserModule,
    FichierModule,
  ],
  controllers: [ArreteCadreController],
  providers: [ArreteCadreService],
  exports: [ArreteCadreService],
})
export class ArreteCadreModule {}
