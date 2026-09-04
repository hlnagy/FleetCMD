import { Controller, Get, Post, Patch, Delete, Body, Param, Headers, Ip, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() body: { identifier: string; parola: string }, @Ip() ip: string) {
    return this.authService.login(body, ip);
  }

  @Get('users')
  getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.authService.getUserById(id);
  }

  @Roles('ADMIN')
  @Post('users')
  createUser(
    @Body() body: {
      nume: string;
      username: string;
      email?: string;
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

  @Roles('ADMIN')
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

  @Roles('ADMIN')
  @Delete('users/:id')
  deleteUser(
    @Param('id') id: string,
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.authService.deleteUser(id, actorUserId);
  }

  @Roles('ADMIN')
  @Post('users/:id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() body: { nouaParola: string },
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.authService.resetPassword(id, body.nouaParola, actorUserId);
  }
}
