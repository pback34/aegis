import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { UpdateLocationUseCase } from '../../application/use-cases/location/update-location.use-case';
import { GetCurrentLocationUseCase } from '../../application/use-cases/location/get-current-location.use-case';
import { Guard } from '../../domain/entities/guard.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserId } from '../../domain/value-objects/user-id.value-object';
import { UserStatus } from '../../domain/entities/user.entity';
import { Money } from '../../domain/value-objects/money.value-object';

describe('LocationsController', () => {
  let controller: LocationsController;
  let mockUpdateLocationUseCase: jest.Mocked<UpdateLocationUseCase>;
  let mockGetCurrentLocationUseCase: jest.Mocked<GetCurrentLocationUseCase>;

  const mockGuard = new Guard({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440001'),
    email: new Email('guard@example.com'),
    passwordHash: 'hashed-password',
    fullName: 'Test Guard',
    status: UserStatus.ACTIVE,
    hourlyRate: new Money(50),
    rating: 5.0,
    isAvailable: true,
  });

  beforeEach(async () => {
    mockUpdateLocationUseCase = {
      execute: jest.fn(),
    } as any;

    mockGetCurrentLocationUseCase = {
      execute: jest.fn(),
    } as any;

    // Set up environment variables for map config
    process.env.MAPBOX_TOKEN = 'test-mapbox-token';
    process.env.MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v11';
    process.env.DEFAULT_MAP_CENTER_LAT = '37.7749';
    process.env.DEFAULT_MAP_CENTER_LNG = '-122.4194';
    process.env.DEFAULT_MAP_ZOOM = '12';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        { provide: UpdateLocationUseCase, useValue: mockUpdateLocationUseCase },
        { provide: GetCurrentLocationUseCase, useValue: mockGetCurrentLocationUseCase },
      ],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
  });

  describe('getMapConfig', () => {
    it('should return Mapbox configuration', async () => {
      const result = await controller.getMapConfig();

      expect(result).toEqual({
        mapboxToken: 'test-mapbox-token',
        mapboxStyle: 'mapbox://styles/mapbox/streets-v11',
        defaultCenter: {
          lat: 37.7749,
          lng: -122.4194,
        },
        defaultZoom: 12,
      });
    });

    it('should use default values when env vars are not set', async () => {
      delete process.env.MAPBOX_TOKEN;
      delete process.env.MAPBOX_STYLE;
      delete process.env.DEFAULT_MAP_CENTER_LAT;
      delete process.env.DEFAULT_MAP_CENTER_LNG;
      delete process.env.DEFAULT_MAP_ZOOM;

      const result = await controller.getMapConfig();

      expect(result).toEqual({
        mapboxToken: '',
        mapboxStyle: 'mapbox://styles/mapbox/streets-v11',
        defaultCenter: {
          lat: 37.7749,
          lng: -122.4194,
        },
        defaultZoom: 12,
      });
    });
  });

  describe('updateLocation', () => {
    it('should update guard location for a booking', async () => {
      const bookingId = 'booking-id';
      const locationDto = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracyMeters: 10,
      };

      const expectedResponse = {
        bookingId,
        guardId: '550e8400-e29b-41d4-a716-446655440001',
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: new Date(),
      };

      mockUpdateLocationUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.updateLocation(mockGuard, bookingId, locationDto);

      expect(result).toEqual(expectedResponse);
      expect(mockUpdateLocationUseCase.execute).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        bookingId,
        locationDto,
      );
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current guard location for a booking', async () => {
      const bookingId = 'booking-id';
      const expectedResponse = {
        bookingId,
        guardId: '550e8400-e29b-41d4-a716-446655440001',
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: new Date(),
        accuracyMeters: 10,
      };

      mockGetCurrentLocationUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getCurrentLocation(bookingId);

      expect(result).toEqual(expectedResponse);
      expect(mockGetCurrentLocationUseCase.execute).toHaveBeenCalledWith(bookingId);
    });
  });
});
