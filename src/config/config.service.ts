import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, MoreThan, Repository } from 'typeorm';
import { Config } from './entities/config.entity';
import moment from 'moment';

@Injectable()
export class ConfigService {

  constructor(
    @InjectRepository(Config)
    private readonly configRepository: Repository<Config>,
  ) {
    this.initConfig();
  }

  async initConfig() {
    const count = await this.configRepository.count();
    if (count > 0) {
      return;
    }
    await this.configRepository.save({});
  }

  getConfig() {
    return this.configRepository.findOne({ where: { id: 1 } });
  }

  async setConfig(computeMapDate: string, computeStatsDate: string) {
    await this.configRepository.createQueryBuilder()
      .update()
      .set({ computeMapDate })
      .where('id = 1')
      .andWhere(new Brackets(qb => {
        qb.where("computeMapDate > :computeMapDate", { computeMapDate })
          .orWhere("computeMapDate IS NULL");
      }))
      .execute();

    await this.configRepository.createQueryBuilder()
      .update()
      .set({ computeStatsDate })
      .where('id = 1')
      .andWhere(new Brackets(qb => {
        qb.where("computeStatsDate > :computeStatsDate", { computeStatsDate })
          .orWhere("computeStatsDate IS NULL");
      }))
      .execute();
  }

  async resetConfig() {
    return this.configRepository.update({ id: 1 }, {
      computeMapDate: null,
      computeStatsDate: null,
    });
  }
}