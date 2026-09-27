import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const checks = [];
const add = (name, ok, detail) => checks.push({ name, ok, detail });
for (const file of [
  'LICENSE',
  'README.md',
  'submission/pitch.pptx',
  'submission/pitch.pdf',
  'submission/cover.png',
  'submission/SUBMISSION.md',
])
  add(file, existsSync(file), existsSync(file) ? 'present' : 'missing');
const screenshots = existsSync('bob_sessions')
  ? readdirSync('bob_sessions').filter((n) => /\.png$/i.test(n))
  : [];
add(
  'Bob task-summary PNGs',
  screenshots.length > 0,
  screenshots.length
    ? `${screenshots.length} image(s); human must verify genuine summaries and participant coverage`
    : 'required screenshots missing',
);
const statement = readFileSync('submission/SUBMISSION.md', 'utf8');
add(
  'Bob usage statement finalized',
  !/DO NOT SUBMIT|eligibility blocker|pending.*Bob|Bob.*pending/i.test(statement),
  'Must describe completed, verified Bob work; placeholder detection is only a preliminary check.',
);
const video = 'submission/final-demo.mp4';
add(
  'Narrated final video',
  existsSync(video),
  existsSync(video)
    ? 'present'
    : 'final-demo.mp4 missing; media/screen-demo.mp4 is intentionally silent source footage',
);
if (existsSync(video)) {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', video],
    { encoding: 'utf8' },
  );
  if (result.status === 0) {
    const data = JSON.parse(result.stdout);
    const duration = Number(data.format.duration);
    add('Video duration <=180 seconds', duration <= 180, `${duration.toFixed(2)} seconds`);
    add(
      'Narration track',
      data.streams.some((s) => s.codec_type === 'audio'),
      'Audio presence does not verify narration quality; watch the final video.',
    );
  } else add('Video inspection', false, 'ffprobe unavailable or file unreadable; inspect manually');
}
add(
  '90+ seconds of actual solution use',
  existsSync(video),
  'Source recording has126 seconds of actual product operation; preserve at least90 in the final edit. Manual final-video check required.',
);
for (const c of checks) console.log(`${c.ok ? 'OK' : 'TODO'} ${c.name}: ${c.detail}`);
console.log(
  '\nFinal human checks: both statements <=500 words; all participants Bob summaries; public code+app URLs; actual Bob work shown; video understandable; submit before deadline. This tool never submits the project.',
);
process.exitCode = checks.every((c) => c.ok) ? 0 : 1;
