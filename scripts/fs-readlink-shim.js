const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, '.next');
const normalizedDistDir = process.platform === 'win32' ? distDir.toLowerCase() : distDir;

const isUnderDistDir = (target) => {
  if (typeof target !== 'string') {
    return false;
  }
  const resolved = path.resolve(target);
  const normalized = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  return normalized === normalizedDistDir || normalized.startsWith(`${normalizedDistDir}${path.sep}`);
};

const shouldBypass = (target) => {
  if (!isUnderDistDir(target)) {
    return false;
  }

  try {
    return !fs.lstatSync(target).isSymbolicLink();
  } catch (err) {
    // Windows/OneDrive can surface EINVAL for files in .next even when they
    // are plain files; treat any lstat failure under the build output as a
    // non-symlink so readlink falls back cleanly.
    return true;
  }
};

if (process.platform === 'win32') {
  const enoentError = (target, cause) => {
    const error = new Error(`ENOENT: no such file or directory, readlink '${target}'`);
    error.code = 'ENOENT';
    error.errno = -4058;
    error.syscall = 'readlink';
    error.path = target;
    error.cause = cause;
    return error;
  };

  const wrapReadlink = (original) => (target, options, callback) => {
    let opts = options;
    let cb = callback;

    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    return original.call(fs, target, opts, (err, linkString) => {
      if (err && err.code === 'EINVAL' && shouldBypass(target)) {
        cb(enoentError(target, err));
        return;
      }
      cb(err, linkString);
    });
  };

  const originalReadlinkSync = fs.readlinkSync.bind(fs);
  fs.readlinkSync = (target, options) => {
    try {
      return originalReadlinkSync(target, options);
    } catch (err) {
      if (err && err.code === 'EINVAL' && shouldBypass(target)) {
        throw enoentError(target, err);
      }
      throw err;
    }
  };

  const originalReadlink = fs.readlink.bind(fs);
  fs.readlink = wrapReadlink(originalReadlink);

  if (fs.promises && typeof fs.promises.readlink === 'function') {
    const originalPromisesReadlink = fs.promises.readlink.bind(fs.promises);
    fs.promises.readlink = async (target, options) => {
      try {
        return await originalPromisesReadlink(target, options);
      } catch (err) {
        if (err && err.code === 'EINVAL' && shouldBypass(target)) {
          throw enoentError(target, err);
        }
        throw err;
      }
    };
  }
}
