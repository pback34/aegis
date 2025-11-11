import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateBookingUseCase } from '../../application/use-cases/booking/create-booking.use-case';
import { GetBookingUseCase } from '../../application/use-cases/booking/get-booking.use-case';
import { ListBookingsUseCase } from '../../application/use-cases/booking/list-bookings.use-case';
import { AcceptBookingUseCase } from '../../application/use-cases/booking/accept-booking.use-case';
import { CompleteBookingUseCase } from '../../application/use-cases/booking/complete-booking.use-case';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../infrastructure/auth/decorators/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/decorators/current-user.decorator';
import { User } from '../../domain/entities/user.entity';
import {
  CreateBookingDto,
  CreateBookingResponseDto,
  GetBookingResponseDto,
  ListBookingsQueryDto,
  ListBookingsResponseDto,
  AcceptBookingResponseDto,
  CompleteBookingResponseDto,
} from '../../application/dtos/booking.dto';

/**
 * Jobs/Bookings Controller
 * Handles booking creation, acceptance, completion, and queries
 * All routes require authentication
 */
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getBookingUseCase: GetBookingUseCase,
    private readonly listBookingsUseCase: ListBookingsUseCase,
    private readonly acceptBookingUseCase: AcceptBookingUseCase,
    private readonly completeBookingUseCase: CompleteBookingUseCase,
  ) {}

  /**
   * Create a new booking (customer only)
   * POST /jobs
   */
  @Roles('customer')
  @Post()
  async createBooking(
    @CurrentUser() user: User,
    @Body() dto: CreateBookingDto,
  ): Promise<CreateBookingResponseDto> {
    const customerId = user.getId().getValue();
    return this.createBookingUseCase.execute(customerId, dto);
  }

  /**
   * Get booking details
   * GET /jobs/:id
   */
  @Get(':id')
  async getBooking(@Param('id') id: string): Promise<GetBookingResponseDto> {
    return this.getBookingUseCase.execute(id);
  }

  /**
   * List bookings (filtered by role and query params)
   * GET /jobs
   *
   * For customers: returns their bookings
   * For guards: returns their assigned bookings or available bookings
   */
  @Get()
  async listBookings(
    @CurrentUser() user: User,
    @Query() query: ListBookingsQueryDto,
  ): Promise<ListBookingsResponseDto> {
    const userId = user.getId().getValue();
    const role = user.getRole();

    // Filter based on role if no specific filter is provided
    if (role === 'customer' && !query.customerId) {
      query.customerId = userId;
    } else if (role === 'guard' && !query.guardId && !query.status) {
      // For guards, show their bookings by default
      query.guardId = userId;
    }

    return this.listBookingsUseCase.execute(query);
  }

  /**
   * Accept a booking (guard only)
   * POST /jobs/:id/accept
   */
  @Roles('guard')
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptBooking(
    @CurrentUser() user: User,
    @Param('id') bookingId: string,
  ): Promise<AcceptBookingResponseDto> {
    const guardId = user.getId().getValue();
    return this.acceptBookingUseCase.execute(guardId, bookingId);
  }

  /**
   * Complete a booking (guard only)
   * POST /jobs/:id/complete
   */
  @Roles('guard')
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeBooking(
    @CurrentUser() user: User,
    @Param('id') bookingId: string,
  ): Promise<CompleteBookingResponseDto> {
    const guardId = user.getId().getValue();
    return this.completeBookingUseCase.execute(guardId, bookingId);
  }
}
