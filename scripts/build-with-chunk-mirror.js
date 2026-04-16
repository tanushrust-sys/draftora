const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = process.cwd();
const readlinkShim = path.join(projectRoot, 'scripts', 'fs-readlink-shim.js');
const workerShim = path.join(projectRoot, 'scripts', 'next-worker-shim.js');
const distDir = path.join(projectRoot, '.next');
const serverDir = path.join(distDir, 'server');
const chunksDir = path.join(serverDir, 'chunks');
const buildIdPath = path.join(distDir, 'BUILD_ID');

function mirrorServerChunks() {
  if (!fs.existsSync(chunksDir)) {
    return;
  }

  for (const entry of fs.readdirSync(chunksDir, { withFileTypes: true })) {
    // Only mirror numeric chunk files. Copying framework/runtime files like
    // webpack-runtime.js into the server root breaks next start.
    if (!entry.isFile() || !/^\d+\.js$/.test(entry.name)) {
      continue;
    }

    const source = path.join(chunksDir, entry.name);
    const destination = path.join(serverDir, entry.name);
    const sourceStat = fs.statSync(source);

    try {
      const destinationStat = fs.statSync(destination);
      if (destinationStat.size === sourceStat.size && destinationStat.mtimeMs === sourceStat.mtimeMs) {
        continue;
      }
    } catch {
      // Destination does not exist yet.
    }

    fs.copyFileSync(source, destination);
    fs.utimesSync(destination, sourceStat.atime, sourceStat.mtime);
  }
}

function ensureBuildId() {
  if (fs.existsSync(buildIdPath)) {
    return;
  }

  const staticDir = path.join(distDir, 'static');
  if (!fs.existsSync(staticDir)) {
    return;
  }

  const buildIdDir = fs.readdirSync(staticDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(staticDir, entry.name, '_buildManifest.js')))
    .map((entry) => entry.name)[0];

  if (buildIdDir) {
    fs.writeFileSync(buildIdPath, `${buildIdDir}\n`);
  }
}

fs.rmSync(distDir, { recursive: true, force: true });

const nextBin = require.resolve('next/dist/bin/next');
const nodeOptions = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : '';
const child = spawn(process.execPath, [nextBin, 'build'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_OPTIONS: `${nodeOptions}--require=${readlinkShim} --require=${workerShim}`,
  },
  stdio: 'inherit',
});

const mirrorTimer = setInterval(() => {
  try {
    mirrorServerChunks();
  } catch (error) {
    console.warn('Chunk mirror warning:', error instanceof Error ? error.message : error);
  }
}, 200);

child.on('error', (error) => {
  clearInterval(mirrorTimer);
  console.error(error);
  process.exit(1);
});

child.on('exit', (code) => {
  clearInterval(mirrorTimer);
  try {
    mirrorServerChunks();
    ensureBuildId();
  } catch {
    // Ignore final sync errors; the build result is already decided.
  }
  process.exit(code ?? 1);
});
