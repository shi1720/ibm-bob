export interface ReleaseContract {
  id: string;
  name: string;
  description: string;
  migrationName: string;
  seedSql: string;
  upSql: string;
  downSql: string;
  oldReadSql: string;
  newReadSql: string;
  newWriteSql: string;
  oldWriteSql: string;
  invariantSql: string;
  tags: string[];
  repair?: {
    summary: string;
    upSql: string;
    downSql: string;
    newWriteSql?: string;
    oldWriteSql?: string;
    newReadSql?: string;
    oldReadSql?: string;
    invariantSql?: string;
  };
}
export interface CheckResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  detail: string;
  sql?: string;
  error?: string;
  before?: unknown[];
  after?: unknown[];
}
export interface RunReport {
  id: string;
  contractId: string;
  contractName: string;
  startedAt: string;
  durationMs: number;
  engine: string;
  status: 'passed' | 'blocked' | 'error';
  checks: CheckResult[];
  contractHash: string;
  summary: string;
}
