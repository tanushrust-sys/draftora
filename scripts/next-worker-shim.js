const Module = require('module');
const childProcess = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');

if (process.platform === 'win32') {
  const originalLoad = Module._load;
  const originalResolveFilename = Module._resolveFilename;
  const originalFork = childProcess.fork.bind(childProcess);
  const startServerPathSuffix = `${path.sep}node_modules${path.sep}next${path.sep}dist${path.sep}server${path.sep}lib${path.sep}start-server.js`;
  const workerModuleSuffix = `${path.sep}node_modules${path.sep}next${path.sep}dist${path.sep}lib${path.sep}worker.js`;
  const staticPathsWorkerSuffix = `${path.sep}node_modules${path.sep}next${path.sep}dist${path.sep}server${path.sep}dev${path.sep}static-paths-worker.js`;

  class InProcessWorker {
    constructor(workerPath, options = {}) {
      this._ended = false;
      this._module = require(workerPath);
      this._options = options;

      for (const method of options.exposedMethods || []) {
        if (method.startsWith('_')) {
          continue;
        }

        this[method] = async (...args) => {
          if (this._ended) {
            throw new Error('Farm is ended, no more calls can be done to it');
          }

          if (typeof this._options.onActivity === 'function') {
            this._options.onActivity();
          }

          const impl = this._module[method];
          if (typeof impl !== 'function') {
            throw new Error(`Worker method not found: ${method}`);
          }

          return await impl(...args);
        };
      }
    }

    async end() {
      this._ended = true;
    }

    close() {
      this._ended = true;
    }
  }

  class InProcessJestWorker {
    constructor(workerPath, options = {}) {
      this._ended = false;
      this._module = require(workerPath);
      this._options = options;
    }

    loadStaticPaths(...args) {
      if (this._ended) {
        throw new Error('Farm is ended, no more calls can be done to it');
      }

      if (typeof this._options.onActivity === 'function') {
        this._options.onActivity();
      }

      return this._module.loadStaticPaths(...args);
    }

    getStdout() {
      return { pipe() {} };
    }

    getStderr() {
      return { pipe() {} };
    }

    async end() {
      this._ended = true;
    }

    close() {
      this._ended = true;
    }
  }

  class InProcessFork extends EventEmitter {
    constructor(modulePath, options = {}) {
      super();
      this._modulePath = modulePath;
      this._options = options;
      this.stdout = null;
      this.stderr = null;
    }

    async send(message) {
      if (!message || typeof message !== 'object' || !message.nextWorkerOptions) {
        return true;
      }

      try {
        const startServer = require(this._modulePath).startServer;
        if (typeof startServer !== 'function') {
          throw new Error('startServer export not found');
        }

        const env = this._options.env || {};
        Object.assign(process.env, env);
        await startServer(message.nextWorkerOptions);
        this.emit('message', { nextServerReady: true, port: process.env.PORT });
        return true;
      } catch (error) {
        this.emit('error', error);
        this.emit('exit', 1, null);
        return false;
      }
    }

    kill() {
      this.emit('exit', 0, null);
      return true;
    }

    disconnect() {}
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    const resolved = originalResolveFilename.call(this, request, parent, isMain);
    if (typeof resolved === 'string' && resolved.toLowerCase().endsWith(workerModuleSuffix)) {
      return { Worker: InProcessWorker };
    }

    if (typeof resolved === 'string' && resolved.toLowerCase().endsWith('next/dist/compiled/jest-worker/index.js')) {
      const original = originalLoad.call(this, request, parent, isMain);
      return {
        ...original,
        Worker: class Worker {
          constructor(workerPath, options = {}) {
            if (typeof workerPath === 'string' && workerPath.toLowerCase().endsWith(staticPathsWorkerSuffix)) {
              return new InProcessJestWorker(workerPath, options);
            }

            return new original.Worker(workerPath, options);
          }
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  childProcess.fork = function patchedFork(modulePath, args, options) {
    let forkArgs = args;
    let forkOptions = options;
    if (forkOptions === undefined && forkArgs && !Array.isArray(forkArgs)) {
      forkOptions = forkArgs;
      forkArgs = [];
    }

    const resolved = path.isAbsolute(modulePath) ? modulePath : originalResolveFilename.call(Module, modulePath, module.parent, false);
    if (typeof resolved === 'string' && resolved.toLowerCase().endsWith(startServerPathSuffix)) {
      const child = new InProcessFork(resolved, forkOptions || {});
      process.nextTick(() => child.emit('message', { nextWorkerReady: true }));
      return child;
    }

    return originalFork(modulePath, forkArgs, forkOptions);
  };
}
