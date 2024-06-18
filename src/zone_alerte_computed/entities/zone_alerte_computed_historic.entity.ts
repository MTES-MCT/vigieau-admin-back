import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity, Index, JoinTable, ManyToMany,
  ManyToOne,
  Polygon,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { BassinVersant } from '../../bassin_versant/entities/bassin_versant.entity';
import { Departement } from '../../departement/entities/departement.entity';
import { Restriction } from '../../restriction/entities/restriction.entity';
import { NiveauGravite } from '../../arrete_restriction/type/niveau_gravite.type';
import { Commune } from '../../commune/entities/commune.entity';

@Entity()
export class ZoneAlerteComputedHistoric extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 200 })
  nom: string;

  @Column({ nullable: true, length: 32 })
  code: string;

  @Column({ nullable: false, length: 50 })
  type: 'SOU' | 'SUP' | 'AEP';

  @Column({ default: false })
  enabled: boolean;

  @Column({
    type: 'geometry',
    nullable: false,
    select: false,
  })
  geom: Polygon;

  @Column('enum', {
    name: 'niveauGravite',
    enum: ['vigilance', 'alerte', 'alerte_renforcee', 'crise'],
    nullable: true,
  })
  niveauGravite: NiveauGravite;

  @ManyToOne(() => Departement, (departement) => departement.zoneAlerteComputedHistoric)
  @Index()
  departement: Departement;

  @ManyToOne(() => BassinVersant, (bassinVersant) => bassinVersant.zoneAlerteComputedHistoric)
  bassinVersant: BassinVersant;

  @ManyToOne(() => Restriction, (restriction) => restriction.zonesAlerteComputedHistoric, {
    onDelete: 'CASCADE',
  })
  restriction: Restriction;

  @ManyToMany(() => Commune, (commune) => commune.zonesAlerteComputedHistoric)
  @JoinTable({
    name: 'zone_alerte_computed_historic_commune',
  })
  communes: Commune[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
