import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const backend = join(root, 'services/sync-backend');
const temporary = await mkdtemp(join(tmpdir(), 'sync-integration-'));
const authFile = join(temporary, 'auth.json');
const classpathFile = join(temporary, 'classpath');
const children = [];
function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    ...options,
  });
  children.push(child);
  return child;
}
function completion(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Process failed with exit ${code}`)),
    );
  });
}
async function ready(url, child) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited before readiness: ${url}`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not become ready: ${url}`);
}
const env = {
  ...process.env,
  SYNC_FRONTEND_AUTH_FILE: authFile,
  SPRING_PROFILES_ACTIVE: '',
  SYNC_STORAGE: 'memory',
  SYNC_DOCUMENTS: 'memory',
  SYNC_DEMO_ENABLED: 'true',
  KYC_MODE: 'mock',
  COGNITO_USER_POOL_ID: '',
  COGNITO_ISSUER_URI: '',
  COGNITO_CLIENT_ID: '',
  SYNC_CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:5174',
  SYNC_PUBLIC_BASE_URL: 'http://127.0.0.1:18081',
};
try {
  // Uses the caller's Java 21 installation; generated auth fixtures stay outside the repository.
  await writeFile(authFile, '[]', { mode: 0o600 });
  await completion(
    start(
      './mvnw',
      [
        '--batch-mode',
        'test-compile',
        'dependency:build-classpath',
        `-Dmdep.outputFile=${classpathFile}`,
      ],
      { cwd: backend, env },
    ),
  );
  const classpath = [
    'target/classes',
    'target/test-classes',
    (await readFile(classpathFile, 'utf8')).trim(),
  ]
    .map((part, i) => (i < 2 ? resolve(backend, part) : part))
    .join(delimiter);
  const java = env.JAVA_HOME ? join(env.JAVA_HOME, 'bin/java') : 'java';
  const server = start(
    java,
    ['-cp', classpath, 'com.airtelsync.backend.FrontendIntegrationServer'],
    { cwd: backend, env },
  );
  await ready('http://127.0.0.1:18081/health', server);
  for (
    let attempt = 0;
    attempt < 40 && JSON.parse(await readFile(authFile, 'utf8')).length === 0;
    attempt++
  )
    await new Promise((resolve) => setTimeout(resolve, 100));
  const frontend = start(
    'npm',
    ['run', 'dev', '--workspace', '@sync/customer', '--', '--port', '5174'],
    {
      env: {
        ...env,
        VITE_API_BASE_URL: 'http://127.0.0.1:18081',
        VITE_COGNITO_AUTHORITY: 'https://issuer.test.example/pool',
        VITE_COGNITO_CLIENT_ID: 'test-app-client',
        VITE_VOICE_API_BASE_URL: '',
      },
    },
  );
  await ready('http://127.0.0.1:5174', frontend);
  await completion(
    start(
      'npx',
      ['playwright', 'test', '-c', 'playwright.integration.config.ts', ...process.argv.slice(2)],
      { env },
    ),
  );
} finally {
  for (const child of children.reverse())
    if (child.exitCode === null) {
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
        else child.kill('SIGTERM');
      } catch {}
    }
  await Promise.all(
    children.map((child) =>
      child.exitCode === null
        ? Promise.race([
            new Promise((resolve) => child.once('exit', resolve)),
            new Promise((resolve) =>
              setTimeout(() => {
                child.kill('SIGKILL');
                resolve();
              }, 4000),
            ),
          ])
        : undefined,
    ),
  );
  await rm(temporary, { recursive: true, force: true });
}
