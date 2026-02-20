import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { AuthTokensResponseDto } from './dto/auth-tokens-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RequestOtpResponseDto } from './dto/request-otp-response.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  @RateLimit('AUTH')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an OTP challenge' })
  @ApiHeader({ name: 'X-Lender-Id', required: true, description: 'Tenant lender ID for anonymous auth flow' })
  @ApiOkResponse({ type: RequestOtpResponseDto })
  async requestOtp(@Body() body: RequestOtpDto): Promise<RequestOtpResponseDto> {
    return this.authService.requestOtp(body);
  }

  @Post('verify-otp')
  @RateLimit('AUTH')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and issue auth tokens' })
  @ApiHeader({ name: 'X-Lender-Id', required: true, description: 'Tenant lender ID for anonymous auth flow' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired OTP challenge' })
  async verifyOtp(@Body() body: VerifyOtpDto): Promise<AuthTokensResponseDto> {
    return this.authService.verifyOtp(body);
  }

  @Post('refresh')
  @RateLimit('AUTH')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new tokens' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked refresh token' })
  async refresh(@Body() body: RefreshTokenDto): Promise<AuthTokensResponseDto> {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @RateLimit('AUTH')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke active refresh token session' })
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  async logout(@Body() body: RefreshTokenDto): Promise<LogoutResponseDto> {
    return this.authService.logout(body);
  }
}
