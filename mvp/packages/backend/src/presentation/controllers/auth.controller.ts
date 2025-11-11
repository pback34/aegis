import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RegisterUserUseCase } from '../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../application/use-cases/auth/login-user.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token.use-case';
import { AuthService } from '../../infrastructure/auth/auth.service';
import { Public } from '../../infrastructure/auth/decorators/public.decorator';
import {
  RegisterUserDto,
  LoginUserDto,
  RefreshTokenDto,
  LoginUserResponseDto,
  RefreshTokenResponseDto,
} from '../../application/dtos/auth.dto';

/**
 * Authentication Controller
 * Handles user registration, login, and token refresh
 * All endpoints are public (no JWT required)
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly authService: AuthService,
  ) {}

  /**
   * Register a new user (customer or guard)
   * POST /auth/register
   */
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterUserDto,
  ): Promise<LoginUserResponseDto> {
    // Register user
    const userResponse = await this.registerUserUseCase.execute(dto);

    // Generate tokens
    // Note: RegisterUserUseCase returns a response DTO, not a User entity
    // So we need to create a minimal user object for token generation
    // In a production system, we'd want to refetch the user or modify the use case
    // For now, we'll generate tokens using the response data
    const tokens = await this.authService.generateTokens({
      getId: () => ({ getValue: () => userResponse.id }),
      getEmail: () => ({ getValue: () => userResponse.email }),
      getRole: () => userResponse.role,
    } as any);

    return {
      user: {
        id: userResponse.id,
        email: userResponse.email,
        role: userResponse.role,
        fullName: userResponse.fullName,
      },
      ...tokens,
    };
  }

  /**
   * Login with email and password
   * POST /auth/login
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginUserDto): Promise<LoginUserResponseDto> {
    // Authenticate user (returns User entity)
    const user = await this.loginUserUseCase.execute(dto);

    // Generate tokens
    const tokens = await this.authService.generateTokens(user);

    return {
      user: {
        id: user.getId().getValue(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
        fullName: user.getFullName(),
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.refreshTokenUseCase.execute(dto);
  }
}
