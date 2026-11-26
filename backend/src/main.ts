import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

if (!(global as any).crypto) {
  (global as any).crypto = crypto;
}

// Automatikus .env betöltés (GEMINI_API_KEY, DATABASE_URL stb.)
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
];
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.substring(0, idx).trim();
          const v = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (k && (!process.env[k] || process.env[k].trim() === '')) {
            process.env[k] = v;
          }
        }
      });
    } catch (e) {}
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureNestApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureNestApp(app);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(` API-ul CMMS Server securizat rulează pe portul ${port}`);
}
bootstrap();
