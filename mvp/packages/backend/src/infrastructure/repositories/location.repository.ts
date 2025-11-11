import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  ILocationRepository,
  LocationUpdate,
} from '../../application/ports/location.repository.interface';
import { GeoLocation } from '../../domain/value-objects/geo-location.value-object';
import { UserId } from '../../domain/value-objects/user-id.value-object';
import { LocationUpdateEntity } from '../database/entities/location-update.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LocationRepository implements ILocationRepository {
  constructor(
    @InjectRepository(LocationUpdateEntity)
    private readonly locationRepository: Repository<LocationUpdateEntity>,
  ) {}

  async save(
    locationUpdate: Omit<LocationUpdate, 'id'>,
  ): Promise<LocationUpdate> {
    const entity: Partial<LocationUpdateEntity> = {
      id: uuidv4(),
      booking_id: locationUpdate.bookingId,
      guard_id: locationUpdate.guardId.getValue(),
      latitude: locationUpdate.location.getLatitude(),
      longitude: locationUpdate.location.getLongitude(),
      accuracy_meters: locationUpdate.accuracyMeters || null,
      timestamp: locationUpdate.timestamp,
    };

    const saved = await this.locationRepository.save(entity);

    return {
      id: saved.id,
      bookingId: saved.booking_id,
      guardId: new UserId(saved.guard_id),
      location: new GeoLocation(saved.latitude, saved.longitude),
      accuracyMeters: saved.accuracy_meters || undefined,
      timestamp: saved.timestamp,
    };
  }

  async getLatestLocationForBooking(
    bookingId: string,
  ): Promise<LocationUpdate | null> {
    const entity = await this.locationRepository.findOne({
      where: { booking_id: bookingId },
      order: { timestamp: 'DESC' },
    });

    if (!entity) {
      return null;
    }

    return {
      id: entity.id,
      bookingId: entity.booking_id,
      guardId: new UserId(entity.guard_id),
      location: new GeoLocation(entity.latitude, entity.longitude),
      accuracyMeters: entity.accuracy_meters || undefined,
      timestamp: entity.timestamp,
    };
  }

  async findByBookingId(bookingId: string): Promise<LocationUpdate[]> {
    const entities = await this.locationRepository.find({
      where: { booking_id: bookingId },
      order: { timestamp: 'DESC' },
    });

    return entities.map((entity) => ({
      id: entity.id,
      bookingId: entity.booking_id,
      guardId: new UserId(entity.guard_id),
      location: new GeoLocation(entity.latitude, entity.longitude),
      accuracyMeters: entity.accuracy_meters || undefined,
      timestamp: entity.timestamp,
    }));
  }

  async deleteOlderThan(date: Date): Promise<void> {
    await this.locationRepository.delete({
      timestamp: LessThan(date),
    });
  }
}
