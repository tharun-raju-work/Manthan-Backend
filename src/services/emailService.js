const sgMail = require('@sendgrid/mail');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');
const logger = require('../config/logger');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  constructor() {
    this.templates = {};
    this.loadTemplates();
  }

  async loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates/email');
    const templates = ['verification', 'reset-password', 'welcome'];

    for (const template of templates) {
      const content = await fs.readFile(
        path.join(templatesDir, `${template}.hbs`),
        'utf-8',
      );
      this.templates[template] = handlebars.compile(content);
    }
  }

  async sendEmail(to, subject, templateName, data) {
    try {
      const html = this.templates[templateName](data);

      const msg = {
        to,
        from: {
          email: process.env.EMAIL_FROM,
          name: process.env.EMAIL_FROM_NAME,
        },
        subject,
        html,
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: false },
        },
      };

      await sgMail.send(msg);
      logger.info(`Email sent to ${to} using template ${templateName}`);
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.API_URL}/verify-email?token=${token}`;
    await this.sendEmail(
      email,
      'Verify Your Email',
      'verification',
      { verificationUrl },
    );
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.API_URL}/reset-password?token=${token}`;
    await this.sendEmail(
      email,
      'Reset Your Password',
      'reset-password',
      { resetUrl },
    );
  }
}

module.exports = new EmailService();
