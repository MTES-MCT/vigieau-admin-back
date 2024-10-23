import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { ZoneAlerte } from './entities/zone_alerte.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { RegleauLogger } from '../logger/regleau.logger';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { DepartementService } from '../departement/departement.service';
import { BassinVersantService } from '../bassin_versant/bassin_versant.service';
import { MailService } from '../shared/services/mail.service';
import { ArreteCadreService } from '../arrete_cadre/arrete_cadre.service';
import { ZoneAlerteComputed } from '../zone_alerte_computed/entities/zone_alerte_computed.entity';

@Injectable()
export class ZoneAlerteService {
  private readonly logger = new RegleauLogger('ZoneAlerteService');

  constructor(
    @InjectRepository(ZoneAlerte)
    private readonly zoneAlerteRepository: Repository<ZoneAlerte>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly departementService: DepartementService,
    private readonly bassinVersantService: BassinVersantService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => ArreteCadreService))
    private readonly arreteCadreService: ArreteCadreService,
  ) {
  }

  findOne(id: number): Promise<any> {
    return this.zoneAlerteRepository
      .createQueryBuilder('zone_alerte')
      .select('zone_alerte.id', 'id')
      .select('zone_alerte.idSandre', 'idSandre')
      .addSelect('zone_alerte.code', 'code')
      .addSelect('zone_alerte.nom', 'nom')
      .addSelect('zone_alerte.type', 'type')
      .addSelect(
        'ST_AsGeoJSON(ST_TRANSFORM(zone_alerte.geom, 4326))',
        'geom',
      )
      .where('zone_alerte.id = :id', { id })
      .getRawOne();
  }

  findByDepartement(departementCode: string): Promise<ZoneAlerte[]> {
    return this.zoneAlerteRepository.find({
      relations: ['departement'],
      where: {
        departement: {
          code: departementCode,
        },
        disabled: false,
      },
    });
  }

  findByArreteCadre(acId: number): Promise<ZoneAlerte[]> {
    return this.zoneAlerteRepository
      .createQueryBuilder('zone_alerte')
      .select('zone_alerte.id', 'id')
      .addSelect('zone_alerte.code', 'code')
      .addSelect('zone_alerte.nom', 'nom')
      .addSelect('zone_alerte.type', 'type')
      .addSelect(
        'ST_AsGeoJSON(ST_TRANSFORM(zone_alerte.geom, 4326), 3)',
        'geom',
      )
      .leftJoin('zone_alerte.arretesCadre', 'arrete_cadre')
      .where('arrete_cadre.id = :acId', { acId })
      .getRawMany();
  }

  findByArreteRestriction(arIds: number[]): Promise<ZoneAlerte[]> | any[] {
    if (!arIds || arIds.length < 1) {
      return [];
    }
    return this.zoneAlerteRepository.find({
      select: {
        id: true,
        idSandre: true,
        code: true,
        nom: true,
        type: true,
        departement: {
          code: true,
          nom: true,
        },
        restrictions: {
          niveauGravite: true,
          arreteRestriction: {
            id: true,
            numero: true,
            dateDebut: true,
            dateFin: true,
            dateSignature: true,
            fichier: {
              url: true,
            },
          },
          usages: {
            nom: true,
            concerneParticulier: true,
            concerneEntreprise: true,
            concerneExploitation: true,
            concerneCollectivite: true,
            concerneEso: true,
            concerneEsu: true,
            concerneAep: true,
            descriptionVigilance: true,
            descriptionAlerte: true,
            descriptionAlerteRenforcee: true,
            descriptionCrise: true,
            thematique: {
              nom: true,
            },
          },
        },
      },
      relations: [
        'departement',
        'restrictions',
        'restrictions.usages',
        'restrictions.usages.thematique',
        'restrictions.arreteRestriction',
        'restrictions.arreteRestriction.fichier',
      ],
      where: {
        restrictions: {
          arreteRestriction: {
            id: In(arIds),
          },
        },
      },
    });
  }

  /**
   * Vérification régulière s'il n'y a pas de nouvelles zones
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async updateZones() {
    this.logger.log('MISE A JOUR DES ZONES D\'ALERTE - DEBUT');
    const departements = await this.departementService.findAllLight();
    try {
      for (const d of departements) {
        let lastUpdate = (await this.zoneAlerteRepository.createQueryBuilder('zone_alerte')
          .select('MAX(zone_alerte.updatedAt)', 'updatedAt')
          .leftJoin('zone_alerte.departement', 'departement')
          .where('departement.id = :depId', { depId: d.id })
          .getRawOne()).updatedAt;
        lastUpdate = lastUpdate ? lastUpdate.toISOString().split('T')[0] : null;
        const filterString = lastUpdate ? `Filter=<Filter>
<And>
<PropertyIsEqualTo><PropertyName>CdDepartement</PropertyName><Literal>${d.code}</Literal></PropertyIsEqualTo>
<PropertyIsGreaterThanOrEqualTo><PropertyName>DateMajZAS</PropertyName><Literal>${lastUpdate}</Literal></PropertyIsGreaterThanOrEqualTo>
</And>
</Filter>` : 'Filter=<Filter><PropertyIsEqualTo><PropertyName>CdDepartement</PropertyName><Literal>${d.code}</Literal></PropertyIsEqualTo></Filter>';
        const url = `${this.configService.get('API_SANDRE')}/geo/zas?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&typename=ZAS&SRSNAME=EPSG:4326&OUTPUTFORMAT=GeoJSON&${filterString}`;

        const { data } = await firstValueFrom(this.httpService.get(url));
        if (data.features?.length > 0) {
          await this.updateDepartementZones(d.code);
        }
      }
    } catch (error) {
      this.logger.error('ERREUR LORS DE LA MISE A JOUR DES ZONES D\'ALERTES', error);
    }
    this.logger.log('MISE A JOUR DES ZONES D\'ALERTE - FIN');
  }

  async updateDepartementZones(depCode: string) {
    this.logger.log(`MISE A JOUR DES ZONES D'ALERTE DU DEPARTEMENT ${depCode}`);
    const filterString = `Filter=<Filter>
<AND>
<PropertyIsEqualTo><PropertyName>CdDepartement</PropertyName><Literal>${depCode}</Literal></PropertyIsEqualTo>
<PropertyIsEqualTo><PropertyName>StZAS</PropertyName><Literal>Validé</Literal></PropertyIsEqualTo>
</AND>
</Filter>`;
    const url = `${this.configService.get('API_SANDRE')}/geo/zas?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&typename=ZAS&SRSNAME=EPSG:4326&OUTPUTFORMAT=GeoJSON&${filterString}`;
    let zonesUpdates = 0;
    let zonesAdded = 0;
    try {
      const { data } = await firstValueFrom(this.httpService.get(url));
      const idsSandre = data.features.map(f => +f.properties.gid);
      const promises = [];
      for (const f of data.features) {
        let existingZone = await this.zoneAlerteRepository.findOne({
          where: [
            {
              idSandre: +f.properties.gid,
            },
            {
              idSandre: IsNull(),
              code: f.properties.CdAltZAS,
              departement: {
                code: depCode,
              },
              type: f.properties.TypeZAS,
              numeroVersion: f.properties.NumeroVersionZAS ? +f.properties.NumeroVersionZAS : IsNull(),
            },
          ],
        });
        if (!existingZone) {
          zonesAdded++;
          existingZone = new ZoneAlerte();
          existingZone.departement = await this.departementService.findByCode(f.properties.CdDepartement);
          existingZone.bassinVersant = await this.bassinVersantService.findByCode(+f.properties.NumCircAdminBassin);
        } else {
          zonesUpdates++;
        }
        existingZone.idSandre = +f.properties.gid;
        existingZone.nom = f.properties.LbZAS;
        existingZone.code = f.properties.CdAltZAS;
        existingZone.type = f.properties.TypeZAS;
        existingZone.numeroVersionSandre = f.properties.NumeroVersionZAS ? +f.properties.NumeroVersionZAS : null;
        existingZone.geom = f.geometry;
        promises.push(this.zoneAlerteRepository.save(existingZone));
      }
      const idsToDisable = await this.zoneAlerteRepository.find({
        select: {
          id: true,
          idSandre: true,
          departement: {
            id: true,
            code: true,
          },
        },
        relations: ['departement'],
        where: [
          {
            departement: {
              code: depCode,
            },
            idSandre: Not(In(idsSandre)),
          },
          {
            departement: {
              code: depCode,
            },
            idSandre: IsNull(),
          },
        ],
      });
      promises.push(
        this.zoneAlerteRepository.update(idsToDisable.map(z => z.id), { disabled: true }),
      );
      await Promise.all(promises);
      this.logger.log(`${zonesUpdates} ZONES D'ALERTES MIS A JOUR`);
      this.logger.log(`${zonesAdded} ZONES D'ALERTES AJOUTEES`);
      if (zonesAdded > 0) {
        const arretesCadre = await this.arreteCadreService.findByDepartement(depCode);
        await this.mailService.sendEmailsByDepartement(
          depCode,
          `Vos nouvelles zones d’alerte ont été intégrées`,
          'maj_za',
          {
            arretesCadre: arretesCadre,
          },
          true,
        );
      }
    } catch (error) {
      this.logger.error(`ERREUR LORS DE LA MISE A JOUR DES ZONES D\'ALERTES DU DEPARTEMENT ${depCode}`, error);
    }
  }

  async getZonesArea(zones: any[]) {
    return this.zoneAlerteRepository
      .createQueryBuilder('zone_alerte')
      .select(
        'SUM(ST_Area(ST_TRANSFORM(zone_alerte.geom, 4326)::geography)/1000000)',
        'area',
      )
      .where('zone_alerte.id IN(:...ids)', { ids: zones.map(z => z.id) })
      .getRawOne();
  }

  getZonesIntersectedWithCommune(zones: ZoneAlerte[], communeId: number) {
    return this.zoneAlerteRepository
      .createQueryBuilder('zone_alerte')
      .select('zone_alerte.id', 'id')
      .addSelect('zone_alerte.code', 'code')
      .addSelect('zone_alerte.nom', 'nom')
      .addSelect('zone_alerte.type', 'type')
      .where('zone_alerte.id IN(:...zonesId)', { zonesId: zones.map(z => z.id) })
      .andWhere('ST_IsValid(ST_TRANSFORM(zone_alerte.geom, 4326))')
      .andWhere('ST_INTERSECTS(ST_TRANSFORM(zone_alerte.geom, 4326), (SELECT ST_TRANSFORM(c.geom, 4326) FROM commune as c WHERE c.id = :communeId))', { communeId })
      // Au moins 1% de la surface en commun
      .andWhere('ST_Area(ST_Intersection(ST_TRANSFORM(zone_alerte.geom, 4326), (SELECT ST_TRANSFORM(c.geom, 4326) FROM commune as c WHERE c.id = :communeId))) / ST_Area((SELECT ST_TRANSFORM(c.geom, 4326) FROM commune as c WHERE c.id = :communeId)) > 0.01', { communeId })
      .getRawMany();
  }
}
