import { spawnSync } from 'child_process';
import * as fs from 'fs';

export interface ParsedPgConnection {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  sslMode?: string;
}

export interface PgDumpResult {
  ok: boolean;
  dumpBuffer?: Buffer;
  method?: 'native-pg_dump' | 'docker-pg_dump';
  reason?: string;
}

/**
 * Parse a PostgreSQL connection URL safely without exposing credentials in CLI args.
 */
export function parsePgConnectionUrl(rawUrl?: string): ParsedPgConnection | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (!parsed.protocol.startsWith('postgres')) return null;

    const database = parsed.pathname.replace(/^\/+/, '');
    if (!database) return null;

    const sslMode = parsed.searchParams.get('sslmode') || undefined;
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port || '5432',
      user: decodeURIComponent(parsed.username || 'postgres'),
      password: decodeURIComponent(parsed.password || ''),
      database: decodeURIComponent(database),
      sslMode,
    };
  } catch {
    return null;
  }
}

/**
 * Attempt to create a transactionally consistent custom-format pg_dump (.dump)
 * automatically supporting both native PostgreSQL installations and Docker containers.
 */
export function tryCreatePgDump(tmpOutputPath: string): PgDumpResult {
  const conn = parsePgConnectionUrl(process.env.DIRECT_URL || process.env.DATABASE_URL);
  if (!conn) {
    return { ok: false, reason: 'DATABASE_URL / DIRECT_URL indisponibil sau nevalid.' };
  }

  const pgEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PGPASSWORD: conn.password,
  };
  if (conn.sslMode) {
    pgEnv.PGSSLMODE = conn.sslMode;
  }

  // Strategy 1: Native pg_dump binary on host or container
  const versionProbe = spawnSync('pg_dump', ['--version'], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  });

  if (!versionProbe.error && versionProbe.status === 0) {
    const dumpRun = spawnSync(
      'pg_dump',
      [
        '--format=custom',
        '--no-owner',
        '--no-acl',
        '-h',
        conn.host,
        '-p',
        conn.port,
        '-U',
        conn.user,
        '-f',
        tmpOutputPath,
        conn.database,
      ],
      {
        env: pgEnv,
        encoding: 'utf8',
        timeout: 120000,
        windowsHide: true,
      },
    );

    if (!dumpRun.error && dumpRun.status === 0 && fs.existsSync(tmpOutputPath)) {
      const dumpBuffer = fs.readFileSync(tmpOutputPath);
      if (dumpBuffer.length > 0) {
        return { ok: true, dumpBuffer, method: 'native-pg_dump' };
      }
    }
  }

  // Strategy 2: Dockerized PostgreSQL (e.g. cmms_postgres)
  const dockerPs = spawnSync('docker', ['ps', '--format', '{{.Names}}\t{{.Image}}'], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  });

  if (!dockerPs.error && dockerPs.status === 0 && dockerPs.stdout) {
    const containers = dockerPs.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, image] = line.split('\t');
        return { name: name || '', image: image || '' };
      });

    const target =
      containers.find((c) => c.name === 'cmms_postgres') ||
      containers.find((c) => c.image.toLowerCase().includes('postgres'));

    if (target) {
      const dbUser = process.env.POSTGRES_USER || conn.user;
      const dbName = process.env.POSTGRES_DB || conn.database;
      const dockerDump = spawnSync(
        'docker',
        [
          'exec',
          '-e',
          'PGPASSWORD',
          target.name,
          'pg_dump',
          '-U',
          dbUser,
          '-d',
          dbName,
          '--format=custom',
          '--no-owner',
          '--no-acl',
        ],
        {
          env: pgEnv,
          timeout: 120000,
          maxBuffer: 256 * 1024 * 1024,
          windowsHide: true,
        },
      );

      if (!dockerDump.error && dockerDump.status === 0 && dockerDump.stdout && dockerDump.stdout.length > 0) {
        const dumpBuffer = Buffer.isBuffer(dockerDump.stdout)
          ? dockerDump.stdout
          : Buffer.from(dockerDump.stdout);
        return { ok: true, dumpBuffer, method: 'docker-pg_dump' };
      }
    }
  }

  return {
    ok: false,
    reason: 'pg_dump nu este disponibil în PATH și nici un container Docker PostgreSQL activ nu a fost detectat.',
  };
}
