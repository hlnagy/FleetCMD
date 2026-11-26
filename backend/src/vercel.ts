import 'reflect-metadata';
import * as crypto from 'crypto';
import * as express from 'express';
import type { Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureNestApp } from './app.setup';

if (!(global as any).crypto) {
  (global as any).crypto = crypto;
}

const server = express();
let cachedInitPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!cachedInitPromise) {
    cachedInitPromise = (async () => {
      const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
        logger: ['error', 'warn'],
      });
      configureNestApp(app);
      await app.init();
    })().catch((err) => {
      cachedInitPromise = null;
      throw err;
    });
  }
  return cachedInitPromise;
}

export default async function handler(req: Request, res: Response) {
  await ensureInitialized();
  return server(req, res);
}
