import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as path from 'path';
import { RegleauLogger } from '../../logger/regleau.logger';
import { DepartementService } from '../../departement/departement.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class MailService {
  /**
   * LIEN UTILES
   * Preview de templates handlebars : https://handlebars-email-html-previewer.vercel.app/
   * Template d'Email : https://github.com/leemunroe/responsive-html-email-template
   */
  private readonly logger = new RegleauLogger('MailService');

  constructor(private readonly mailerService: MailerService,
              private readonly userService: UserService) {
  }

  /**
   * Envoi d'un email selon un template
   * @param email
   * @param subject
   * @param template
   * @param context
   */
  sendEmail(
    email: string,
    subject: string,
    template: string,
    context?: any,
  ): Promise<any> {
    if(!process.env.MAIL_USER) {
      this.logger.log(`EMAIL NOT SEND - NO MAIL_USER ${email} WITH SUBJECT: ${subject} WITH TEMPLATE: ${template}`)
      return;
    }
    return this.mailerService
      .sendMail({
        to: email,
        from: `${process.env.MAIL_USER}`,
        subject: `VigiEau Admin - ${subject}`,
        template: `./${template}`,
        context: context,
      })
      .then(() => {
        this.logger.log(
          `MAIL SEND TO: ${email} WITH SUBJECT: ${subject} WITH TEMPLATE: ${template} AND CONTEXT: ${JSON.stringify(
            context,
          )}`,
        );
      })
      .catch((error) => {
        this.logger.error(
          `FAIL - MAIL SEND TO: ${email} WITH SUBJECT: ${subject} WITH TEMPLATE: ${template} AND CONTEXT: ${JSON.stringify(
            context,
          )}`,
          error,
        );
      });
  }

  sendEmails(
    emails: string[],
    subject: string,
    template: string,
    context?: any,
  ): Promise<any> {
    return Promise.all(
      emails.map((email) => this.sendEmail(email, subject, template, context)),
    );
  }

  async sendEmailsByDepartement(
    depCode: string,
    subject: string,
    template: string,
    context?: any,
  ): Promise<any> {
    const users = await this.userService.findByDepartementsCode([depCode]);
    return Promise.all(
      users.map((u) => u.email).map((email) => this.sendEmail(email, subject, template, context)),
    );
  }
}
