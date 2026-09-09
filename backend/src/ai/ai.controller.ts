import { Controller, Post, Get, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { Public } from '../auth/public.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Post('chat')
  async chat(@Body() body: { message: string; history?: any[] }) {
    const message = body?.message || '';
    const history = body?.history || [];
    return this.aiService.chat(message, history);
  }

  @Public()
  @Get('fleet-kpi')
  async getQuickKpi() {
    return this.aiService.getQuickKpi();
  }

  @Public()
  @Get('status')
  async getStatus() {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '';
    return {
      connected: true,
      engine: hasKey ? 'gemini-generative' : 'fleet-builtin-engine',
      hasGeminiKey: hasKey,
    };
  }
}
