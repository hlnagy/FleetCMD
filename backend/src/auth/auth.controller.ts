import { Controller, Get, Post, Patch, Delete, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { identifier: string; parola: string }) {
    return this.authService.login(body);
  }

  @Get('users')
  getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.authService.getUserById(id);
  }

  @Post('users')
  createUser(
    @Body() body: {
      nume: string;
      email: string;
      username?: string;
      parola: string;
      rol: string;
      functie?: string;
      telefon?: string;
    },
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.authService.createUser({
      ...body,
      actorUserId,
    });
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: {
      nume?: string;
      email?: string;
      username?: string;
      parola?: string;
      rol?: string;
      functie?: string;
      telefon?: string;
      activ?: boolean;
    },
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.authService.updateUser(id, {
      ...body,
      actorUserId,
    });
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.authService.deleteUser(id, actorUserId);
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() body: { nouaParola: string },
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.authService.resetPassword(id, body.nouaParola, actorUserId);
  }
}
