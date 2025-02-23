const cluster = require('cluster');
const os = require('os');

const setupCluster = () => {
  if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`Master cluster setting up ${numCPUs} workers`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('online', (worker) => {
      console.log(`Worker ${worker.process.pid} is online`);
    });

    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
      console.log('Starting a new worker');
      cluster.fork();
    });
  }

  return cluster.isWorker;
};

module.exports = setupCluster; 