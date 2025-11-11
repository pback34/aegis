import { Injectable, Logger } from '@nestjs/common';
import * as Ably from 'ably';
import {
  ILocationService,
  LocationUpdatePayload,
} from '../../application/ports/location-service.interface';
import { GeoLocation } from '../../domain/value-objects/geo-location.value-object';

/**
 * Ably Location Service Adapter
 * Implements ILocationService using Ably Realtime API
 */
@Injectable()
export class AblyLocationServiceAdapter implements ILocationService {
  private readonly logger = new Logger(AblyLocationServiceAdapter.name);
  private readonly client: Ably.Realtime;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Ably API key is required');
    }

    this.client = new Ably.Realtime({
      key: apiKey,
      echoMessages: false, // Don't receive our own messages
    });

    this.setupConnectionLogging();
    this.logger.log('Ably Location Service initialized');
  }

  /**
   * Publish a location update to the real-time channel
   * Channel format: jobs:{bookingId}:location
   */
  async publishLocationUpdate(payload: LocationUpdatePayload): Promise<void> {
    const channelName = this.getChannelName(payload.bookingId);

    try {
      this.logger.log(
        `Publishing location update for booking ${payload.bookingId}`,
      );

      const channel = this.client.channels.get(channelName);

      await channel.publish('location-update', {
        guardId: payload.guardId,
        latitude: payload.location.getLatitude(),
        longitude: payload.location.getLongitude(),
        timestamp: payload.timestamp.toISOString(),
      });

      this.logger.log(
        `Location update published successfully for booking ${payload.bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish location update: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw this.handleAblyError(error);
    }
  }

  /**
   * Subscribe to location updates for a specific booking
   * Returns an unsubscribe function
   */
  async subscribeToLocationUpdates(
    bookingId: string,
    callback: (payload: LocationUpdatePayload) => void,
  ): Promise<() => void> {
    const channelName = this.getChannelName(bookingId);

    try {
      this.logger.log(`Subscribing to location updates for booking ${bookingId}`);

      const channel = this.client.channels.get(channelName);

      // Subscribe to location-update events
      await channel.subscribe('location-update', (message) => {
        try {
          const data = message.data as {
            guardId: string;
            latitude: number;
            longitude: number;
            timestamp: string;
          };

          // Transform Ably message back to LocationUpdatePayload
          const locationPayload: LocationUpdatePayload = {
            bookingId,
            guardId: data.guardId,
            location: new GeoLocation(data.latitude, data.longitude),
            timestamp: new Date(data.timestamp),
          };

          callback(locationPayload);
        } catch (error) {
          this.logger.error(
            `Error processing location update: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      });

      this.logger.log(
        `Subscribed to location updates for booking ${bookingId}`,
      );

      // Return unsubscribe function
      return () => {
        channel.unsubscribe();
        this.logger.log(
          `Unsubscribed from location updates for booking ${bookingId}`,
        );
      };
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to location updates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw this.handleAblyError(error);
    }
  }

  /**
   * Get the channel name for a booking
   */
  private getChannelName(bookingId: string): string {
    return `jobs:${bookingId}:location`;
  }

  /**
   * Setup connection event logging
   */
  private setupConnectionLogging(): void {
    this.client.connection.on('connected', () => {
      this.logger.log('Connected to Ably');
    });

    this.client.connection.on('disconnected', () => {
      this.logger.warn('Disconnected from Ably');
    });

    this.client.connection.on('failed', (stateChange) => {
      this.logger.error(
        `Ably connection failed: ${stateChange.reason?.message || 'Unknown reason'}`,
      );
    });
  }

  /**
   * Handle Ably errors and convert them to domain errors
   */
  private handleAblyError(error: unknown): Error {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message: string }).message || 'Ably error occurred';
      return new Error(`Location service error: ${message}`);
    }

    if (error instanceof Error) {
      return new Error(`Location service error: ${error.message}`);
    }

    return new Error('Unknown location service error');
  }

  /**
   * Close the Ably connection (useful for cleanup in tests)
   */
  async close(): Promise<void> {
    this.logger.log('Closing Ably connection');
    this.client.close();
  }
}
