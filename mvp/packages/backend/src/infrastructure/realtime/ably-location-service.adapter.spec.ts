import { AblyLocationServiceAdapter } from './ably-location-service.adapter';
import { GeoLocation } from '../../domain/value-objects/geo-location.value-object';
import { LocationUpdatePayload } from '../../application/ports/location-service.interface';
import * as Ably from 'ably';

// Mock the Ably module
jest.mock('ably');

describe('AblyLocationServiceAdapter', () => {
  let adapter: AblyLocationServiceAdapter;
  let mockChannelPublish: jest.Mock;
  let mockChannelSubscribe: jest.Mock;
  let mockChannelUnsubscribe: jest.Mock;
  let mockChannelGet: jest.Mock;
  let mockConnectionOn: jest.Mock;
  let mockClose: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock functions
    mockChannelPublish = jest.fn();
    mockChannelSubscribe = jest.fn();
    mockChannelUnsubscribe = jest.fn();
    mockChannelGet = jest.fn();
    mockConnectionOn = jest.fn();
    mockClose = jest.fn();

    // Mock Ably Realtime constructor
    (Ably.Realtime as unknown as jest.Mock).mockImplementation(() => ({
      channels: {
        get: mockChannelGet,
      },
      connection: {
        on: mockConnectionOn,
      },
      close: mockClose,
    }));

    // Setup default channel mock
    mockChannelGet.mockReturnValue({
      publish: mockChannelPublish,
      subscribe: mockChannelSubscribe,
      unsubscribe: mockChannelUnsubscribe,
    });

    // Create adapter instance
    adapter = new AblyLocationServiceAdapter('test_api_key');
  });

  describe('constructor', () => {
    it('should throw error if API key is not provided', () => {
      expect(() => new AblyLocationServiceAdapter('')).toThrow(
        'Ably API key is required',
      );
    });

    it('should initialize Ably with correct configuration', () => {
      expect(Ably.Realtime).toHaveBeenCalledWith({
        key: 'test_api_key',
        echoMessages: false,
      });
    });

    it('should setup connection event logging', () => {
      // Verify that connection.on was called for connected, disconnected, and failed events
      expect(mockConnectionOn).toHaveBeenCalledWith(
        'connected',
        expect.any(Function),
      );
      expect(mockConnectionOn).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function),
      );
      expect(mockConnectionOn).toHaveBeenCalledWith(
        'failed',
        expect.any(Function),
      );
    });
  });

  describe('publishLocationUpdate', () => {
    it('should publish location update to correct channel', async () => {
      const payload: LocationUpdatePayload = {
        bookingId: 'booking_123',
        guardId: 'guard_456',
        location: new GeoLocation(40.7128, -74.006),
        timestamp: new Date('2024-01-15T10:30:00Z'),
      };

      mockChannelPublish.mockResolvedValue(undefined);

      await adapter.publishLocationUpdate(payload);

      expect(mockChannelGet).toHaveBeenCalledWith('jobs:booking_123:location');
      expect(mockChannelPublish).toHaveBeenCalledWith('location-update', {
        guardId: 'guard_456',
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: '2024-01-15T10:30:00.000Z',
      });
    });

    it('should handle different coordinate values', async () => {
      const payload: LocationUpdatePayload = {
        bookingId: 'booking_789',
        guardId: 'guard_012',
        location: new GeoLocation(51.5074, -0.1278),
        timestamp: new Date('2024-02-20T14:45:30Z'),
      };

      mockChannelPublish.mockResolvedValue(undefined);

      await adapter.publishLocationUpdate(payload);

      expect(mockChannelGet).toHaveBeenCalledWith('jobs:booking_789:location');
      expect(mockChannelPublish).toHaveBeenCalledWith('location-update', {
        guardId: 'guard_012',
        latitude: 51.5074,
        longitude: -0.1278,
        timestamp: '2024-02-20T14:45:30.000Z',
      });
    });

    it('should throw error when publish fails', async () => {
      const payload: LocationUpdatePayload = {
        bookingId: 'booking_123',
        guardId: 'guard_456',
        location: new GeoLocation(40.7128, -74.006),
        timestamp: new Date('2024-01-15T10:30:00Z'),
      };

      const ablyError = new Error('Network error');
      mockChannelPublish.mockRejectedValue(ablyError);

      await expect(adapter.publishLocationUpdate(payload)).rejects.toThrow(
        'Location service error: Network error',
      );
    });

    it('should handle unknown error types', async () => {
      const payload: LocationUpdatePayload = {
        bookingId: 'booking_123',
        guardId: 'guard_456',
        location: new GeoLocation(40.7128, -74.006),
        timestamp: new Date('2024-01-15T10:30:00Z'),
      };

      mockChannelPublish.mockRejectedValue('string error');

      await expect(adapter.publishLocationUpdate(payload)).rejects.toThrow(
        'Unknown location service error',
      );
    });

    it('should handle error with message property', async () => {
      const payload: LocationUpdatePayload = {
        bookingId: 'booking_123',
        guardId: 'guard_456',
        location: new GeoLocation(40.7128, -74.006),
        timestamp: new Date('2024-01-15T10:30:00Z'),
      };

      mockChannelPublish.mockRejectedValue({ message: 'Connection timeout' });

      await expect(adapter.publishLocationUpdate(payload)).rejects.toThrow(
        'Location service error: Connection timeout',
      );
    });
  });

  describe('subscribeToLocationUpdates', () => {
    it('should subscribe to location updates on correct channel', async () => {
      const bookingId = 'booking_123';
      const callback = jest.fn();

      mockChannelSubscribe.mockResolvedValue(undefined);

      await adapter.subscribeToLocationUpdates(bookingId, callback);

      expect(mockChannelGet).toHaveBeenCalledWith('jobs:booking_123:location');
      expect(mockChannelSubscribe).toHaveBeenCalledWith(
        'location-update',
        expect.any(Function),
      );
    });

    it('should return unsubscribe function', async () => {
      const bookingId = 'booking_123';
      const callback = jest.fn();

      mockChannelSubscribe.mockResolvedValue(undefined);

      const unsubscribe = await adapter.subscribeToLocationUpdates(
        bookingId,
        callback,
      );

      expect(typeof unsubscribe).toBe('function');

      // Call the unsubscribe function
      unsubscribe();

      expect(mockChannelUnsubscribe).toHaveBeenCalled();
    });

    it('should transform Ably message to LocationUpdatePayload and call callback', async () => {
      const bookingId = 'booking_123';
      const callback = jest.fn();
      let messageHandler: ((message: any) => void) | undefined;

      mockChannelSubscribe.mockImplementation(
        (event: string, handler: (message: any) => void) => {
          messageHandler = handler;
          return Promise.resolve();
        },
      );

      await adapter.subscribeToLocationUpdates(bookingId, callback);

      // Simulate receiving a message from Ably
      const mockMessage = {
        data: {
          guardId: 'guard_456',
          latitude: 40.7128,
          longitude: -74.006,
          timestamp: '2024-01-15T10:30:00.000Z',
        },
      };

      messageHandler!(mockMessage);

      // Verify callback was called with correct payload
      expect(callback).toHaveBeenCalledTimes(1);
      const callArg = callback.mock.calls[0][0] as LocationUpdatePayload;
      expect(callArg.bookingId).toBe('booking_123');
      expect(callArg.guardId).toBe('guard_456');
      expect(callArg.location.getLatitude()).toBe(40.7128);
      expect(callArg.location.getLongitude()).toBe(-74.006);
      expect(callArg.timestamp).toEqual(new Date('2024-01-15T10:30:00.000Z'));
    });

    it('should handle multiple location updates', async () => {
      const bookingId = 'booking_123';
      const callback = jest.fn();
      let messageHandler: ((message: any) => void) | undefined;

      mockChannelSubscribe.mockImplementation(
        (event: string, handler: (message: any) => void) => {
          messageHandler = handler;
          return Promise.resolve();
        },
      );

      await adapter.subscribeToLocationUpdates(bookingId, callback);

      // Simulate receiving multiple messages
      const messages = [
        {
          data: {
            guardId: 'guard_456',
            latitude: 40.7128,
            longitude: -74.006,
            timestamp: '2024-01-15T10:30:00.000Z',
          },
        },
        {
          data: {
            guardId: 'guard_456',
            latitude: 40.7129,
            longitude: -74.0061,
            timestamp: '2024-01-15T10:31:00.000Z',
          },
        },
      ];

      messages.forEach((msg) => messageHandler!(msg));

      expect(callback).toHaveBeenCalledTimes(2);

      // Verify first call
      const firstCall = callback.mock.calls[0][0] as LocationUpdatePayload;
      expect(firstCall.location.getLatitude()).toBe(40.7128);

      // Verify second call
      const secondCall = callback.mock.calls[1][0] as LocationUpdatePayload;
      expect(secondCall.location.getLatitude()).toBe(40.7129);
    });

    it('should handle malformed message data gracefully', async () => {
      const bookingId = 'booking_123';
      const callback = jest.fn();
      let messageHandler: ((message: any) => void) | undefined;

      mockChannelSubscribe.mockImplementation(
        (event: string, handler: (message: any) => void) => {
          messageHandler = handler;
          return Promise.resolve();
        },
      );

      await adapter.subscribeToLocationUpdates(bookingId, callback);

      // Simulate receiving a malformed message
      const mockMessage = {
        data: {
          // Missing required fields
          guardId: 'guard_456',
        },
      };

      // Should not throw, just log error
      expect(() => messageHandler!(mockMessage)).not.toThrow();

      // Callback should not be called with malformed data
      expect(callback).not.toHaveBeenCalled();
    });

    it('should throw error when subscribe fails', async () => {
      const bookingId = 'booking_123';
      const callback = jest.fn();

      const ablyError = new Error('Channel subscription failed');
      mockChannelSubscribe.mockRejectedValue(ablyError);

      await expect(
        adapter.subscribeToLocationUpdates(bookingId, callback),
      ).rejects.toThrow('Location service error: Channel subscription failed');
    });

    it('should handle unknown error types during subscription', async () => {
      const bookingId = 'booking_123';
      const callback = jest.fn();

      mockChannelSubscribe.mockRejectedValue('string error');

      await expect(
        adapter.subscribeToLocationUpdates(bookingId, callback),
      ).rejects.toThrow('Unknown location service error');
    });
  });

  describe('close', () => {
    it('should close the Ably connection', async () => {
      await adapter.close();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('channel name generation', () => {
    it('should generate correct channel name format', async () => {
      const bookingId = 'test_booking_999';
      const payload: LocationUpdatePayload = {
        bookingId,
        guardId: 'guard_789',
        location: new GeoLocation(48.8566, 2.3522),
        timestamp: new Date(),
      };

      mockChannelPublish.mockResolvedValue(undefined);

      await adapter.publishLocationUpdate(payload);

      expect(mockChannelGet).toHaveBeenCalledWith('jobs:test_booking_999:location');
    });
  });

  describe('connection events', () => {
    it('should setup connection event handlers', () => {
      // Verify connection.on was called with correct event names
      const connectionOnCalls = mockConnectionOn.mock.calls;

      const eventNames = connectionOnCalls.map(call => call[0]);
      expect(eventNames).toContain('connected');
      expect(eventNames).toContain('disconnected');
      expect(eventNames).toContain('failed');
    });

    it('should handle connection events', () => {
      // Get the event handlers
      const connectionOnCalls = mockConnectionOn.mock.calls;

      const connectedHandler = connectionOnCalls.find(call => call[0] === 'connected')?.[1];
      const disconnectedHandler = connectionOnCalls.find(call => call[0] === 'disconnected')?.[1];
      const failedHandler = connectionOnCalls.find(call => call[0] === 'failed')?.[1];

      // Should not throw when called
      expect(() => connectedHandler?.()).not.toThrow();
      expect(() => disconnectedHandler?.()).not.toThrow();
      expect(() => failedHandler?.({ reason: { message: 'Test failure' } })).not.toThrow();
    });
  });
});
