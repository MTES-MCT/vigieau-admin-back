import { Departement } from 'src/departement/entities/departement.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Region {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false, length: 3 })
  code: string;

  @Column({ nullable: false, length: 255 })
  nom: string;

  @Column({ nullable: false, default: false })
  domOn: boolean;

  @OneToMany(() => Departement, (departements) => departements.region)
  departements: Departement[];
}