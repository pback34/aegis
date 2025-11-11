import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IBookingRepository } from '../../application/ports/booking.repository.interface';
import { Booking, BookingStatus } from '../../domain/entities/booking.entity';
import { UserId } from '../../domain/value-objects/user-id.value-object';
import { BookingEntity } from '../database/entities/booking.entity';
import { BookingMapper } from './mappers/booking.mapper';

@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
  ) {}

  async save(booking: Booking): Promise<Booking> {
    const bookingEntity = BookingMapper.toPersistence(booking);
    const saved = await this.bookingRepository.save(bookingEntity);
    return BookingMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Booking | null> {
    const bookingEntity = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!bookingEntity) {
      return null;
    }

    return BookingMapper.toDomain(bookingEntity);
  }

  async update(booking: Booking): Promise<Booking> {
    const bookingEntity = BookingMapper.toPersistence(booking);
    await this.bookingRepository.update(booking.getId(), bookingEntity);
    const updated = await this.findById(booking.getId());
    if (!updated) {
      throw new Error(`Booking ${booking.getId()} not found after update`);
    }
    return updated;
  }

  async findByCustomerId(customerId: UserId): Promise<Booking[]> {
    const bookingEntities = await this.bookingRepository.find({
      where: { customer_id: customerId.getValue() },
      order: { created_at: 'DESC' },
    });

    return bookingEntities.map((entity) => BookingMapper.toDomain(entity));
  }

  async findByGuardId(guardId: UserId): Promise<Booking[]> {
    const bookingEntities = await this.bookingRepository.find({
      where: { guard_id: guardId.getValue() },
      order: { created_at: 'DESC' },
    });

    return bookingEntities.map((entity) => BookingMapper.toDomain(entity));
  }

  async findByStatus(status: BookingStatus): Promise<Booking[]> {
    const bookingEntities = await this.bookingRepository.find({
      where: { status },
      order: { created_at: 'DESC' },
    });

    return bookingEntities.map((entity) => BookingMapper.toDomain(entity));
  }

  async findActiveBookingForGuard(guardId: UserId): Promise<Booking | null> {
    const bookingEntity = await this.bookingRepository.findOne({
      where: {
        guard_id: guardId.getValue(),
        status: BookingStatus.IN_PROGRESS,
      },
    });

    if (!bookingEntity) {
      return null;
    }

    return BookingMapper.toDomain(bookingEntity);
  }

  async findAvailableBookings(): Promise<Booking[]> {
    const bookingEntities = await this.bookingRepository.find({
      where: { status: BookingStatus.REQUESTED },
      order: { created_at: 'DESC' },
    });

    return bookingEntities.map((entity) => BookingMapper.toDomain(entity));
  }
}
