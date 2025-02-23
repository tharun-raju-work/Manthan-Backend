const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('../config/logger');

class SecurityAuditor {
  async runNpmAudit() {
    return new Promise((resolve, reject) => {
      exec('npm audit --json', (error, stdout) => {
        if (error && error.code !== 1) {
          reject(error);
          return;
        }
        resolve(JSON.parse(stdout));
      });
    });
  }

  async checkDependencies() {
    const packageLock = require('../../package-lock.json');
    const vulnerableDeps = [];

    for (const [dep, info] of Object.entries(packageLock.dependencies)) {
      if (info.deprecated) {
        vulnerableDeps.push({ name: dep, version: info.version, reason: 'deprecated' });
      }
    }

    return vulnerableDeps;
  }

  async generateReport() {
    try {
      const auditResults = await this.runNpmAudit();
      const vulnerableDeps = await this.checkDependencies();

      const report = {
        timestamp: new Date(),
        vulnerabilities: auditResults.vulnerabilities,
        deprecatedDependencies: vulnerableDeps,
        summary: {
          total: auditResults.metadata.vulnerabilities.total,
          critical: auditResults.metadata.vulnerabilities.critical,
          high: auditResults.metadata.vulnerabilities.high,
        },
      };

      // Save report
      const reportPath = path.join(__dirname, '../reports/security');
      if (!fs.existsSync(reportPath)) {
        fs.mkdirSync(reportPath, { recursive: true });
      }

      fs.writeFileSync(
        path.join(reportPath, `audit-${Date.now()}.json`),
        JSON.stringify(report, null, 2),
      );

      // Alert if critical vulnerabilities found
      if (report.summary.critical > 0) {
        logger.error(`Critical vulnerabilities found: ${report.summary.critical}`);
        // Send alert (implement your alert mechanism here)
      }

      return report;
    } catch (error) {
      logger.error('Security audit failed:', error);
      throw error;
    }
  }
}

module.exports = new SecurityAuditor();
