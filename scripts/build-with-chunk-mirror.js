const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, '.next');
const serverDir = path.join(distDir, 'server');
const chunksDir = path.join(serverDir, 'chunks');

function mirrorServerChunks() {
  if (!fs.existsSync(chunksDir)) {
    return;
  }

  for (const entry of fs.readdirSync(chunksDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) {
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

fs.rmSync(distDir, { recursive: true, force: true });

const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'build'], {
  cwd: projectRoot,
  env: process.env,
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
  } catch {
    // Ignore final sync errors; the build result is already decided.
  }
  process.exit(code ?? 1);
});
