const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { logError } = require('../utils/logger.helper');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Template cache
    this.templates = {};
  }

  async loadTemplate(templateName) {
    try {
      if (this.templates[templateName]) {
        return this.templates[templateName];
      }

      const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      this.templates[templateName] = template;
      return template;
    } catch (error) {
      logError('EmailService.loadTemplate', error);
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  async sendEmail(to, subject, templateName, data) {
    try {
      const template = await this.loadTemplate(templateName);
      const html = template(data);

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      logError('EmailService.sendEmail', error);
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await this.sendEmail(
      user.email,
      'Password Reset Request',
      'password-reset',
      {
        username: user.username,
        resetUrl,
        expiresIn: '1 hour'
      }
    );
  }

  async sendWelcomeEmail(user) {
    await this.sendEmail(
      user.email,
      'Welcome to Our Platform',
      'welcome',
      {
        username: user.username,
        loginUrl: process.env.FRONTEND_URL + '/login'
      }
    );
  }

  async sendGroupInvitation(email, groupName, inviterName, token) {
    const acceptUrl = `${process.env.FRONTEND_URL}/groups/join?token=${token}`;
    
    await this.sendEmail(
      email,
      `Invitation to join ${groupName}`,
      'group-invitation',
      {
        groupName,
        inviterName,
        acceptUrl
      }
    );
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logError('EmailService.verifyConnection', error);
      return false;
    }
  }
}

module.exports = new EmailService(); 