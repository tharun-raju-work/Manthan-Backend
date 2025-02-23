const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');
const logger = require('../config/logger');

class BackupService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    this.backupPath = path.join(__dirname, '../backups');
  }

  async createMongoBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.gz`;
    const filepath = path.join(this.backupPath, filename);

    return new Promise((resolve, reject) => {
      exec(
        `mongodump --uri="${process.env.MONGODB_URI}" --gzip --archive=${filepath}`,
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(filepath);
        },
      );
    });
  }

  async uploadToS3(filepath) {
    const filename = path.basename(filepath);
    const fileStream = fs.createReadStream(filepath);

    const params = {
      Bucket: process.env.AWS_BACKUP_BUCKET,
      Key: `mongodb/${filename}`,
      Body: fileStream,
    };

    return this.s3.upload(params).promise();
  }

  async cleanup(filepath) {
    // Remove local backup file
    fs.unlinkSync(filepath);

    // Remove old backups from S3
    const oldBackups = await this.s3.listObjects({
      Bucket: process.env.AWS_BACKUP_BUCKET,
      Prefix: 'mongodb/',
    }).promise();

    // Keep only last 7 days of backups
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    for (const obj of oldBackups.Contents) {
      if (new Date(obj.LastModified) < cutoffDate) {
        await this.s3.deleteObject({
          Bucket: process.env.AWS_BACKUP_BUCKET,
          Key: obj.Key,
        }).promise();
      }
    }
  }

  async performBackup() {
    try {
      logger.info('Starting database backup...');
      const filepath = await this.createMongoBackup();

      logger.info('Uploading backup to S3...');
      await this.uploadToS3(filepath);

      logger.info('Cleaning up old backups...');
      await this.cleanup(filepath);

      logger.info('Backup completed successfully');
    } catch (error) {
      logger.error('Backup failed:', error);
      throw error;
    }
  }
}

module.exports = new BackupService();
