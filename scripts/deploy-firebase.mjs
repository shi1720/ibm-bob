import { spawnSync } from 'node:child_process';

const project = 'undoproof';
const appId = '1:474592281868:web:eb95b61510d2f02ea93529';
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  return result;
}
const cli = ['--yes', 'firebase-tools@15.31.0'];
const config = run(
  'npx',
  [...cli, 'apps:sdkconfig', 'WEB', appId, '--project', project, '--json'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
);
const response = JSON.parse(config.stdout);
const firebase = response.result.sdkConfig || response.result;
for (const field of ['apiKey', 'authDomain', 'projectId', 'appId']) {
  if (typeof firebase[field] !== 'string' || !firebase[field])
    throw new Error(`Missing Firebase ${field}`);
}
run('npm', ['run', 'build'], {
  env: {
    ...process.env,
    BASE_PATH: '/',
    VITE_FIREBASE_API_KEY: firebase.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: firebase.authDomain,
    VITE_FIREBASE_PROJECT_ID: firebase.projectId,
    VITE_FIREBASE_APP_ID: firebase.appId,
  },
});
run('npx', [
  ...cli,
  'deploy',
  '--only',
  'hosting,firestore',
  '--project',
  project,
  '--non-interactive',
]);
console.log(
  'Deployed https://undoproof.web.app. Run the hosted browser tests before announcing the release.',
);
