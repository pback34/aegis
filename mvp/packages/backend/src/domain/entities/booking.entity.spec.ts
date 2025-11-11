import { Booking, BookingStatus } from './booking.entity';
import { UserId, GeoLocation, Money } from '../value-objects';

describe('Booking Entity', () => {
  let customerId: UserId;
  let guardId: UserId;
  let serviceLocation: GeoLocation;
  let scheduledStart: Date;
  let scheduledEnd: Date;

  beforeEach(() => {
    customerId = UserId.create();
    guardId = UserId.create();
    serviceLocation = new GeoLocation(40.7128, -74.0060);
    scheduledStart = new Date('2024-12-01T10:00:00Z');
    scheduledEnd = new Date('2024-12-01T14:00:00Z');
  });

  describe('create', () => {
    it('should create a booking in REQUESTED status', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      expect(booking.getId()).toBeDefined();
      expect(booking.getStatus()).toBe(BookingStatus.REQUESTED);
      expect(booking.getCustomerId()).toEqual(customerId);
      expect(booking.getEstimatedHours()).toBe(4);
    });

    it('should throw error for invalid estimated hours', () => {
      expect(() =>
        Booking.create(
          customerId,
          '123 Main St, New York, NY',
          serviceLocation,
          scheduledStart,
          scheduledEnd,
          0,
        ),
      ).toThrow('Estimated hours must be greater than 0');
    });

    it('should throw error when scheduled end is before start', () => {
      const invalidEnd = new Date('2024-12-01T09:00:00Z');
      expect(() =>
        Booking.create(customerId, '123 Main St, New York, NY', serviceLocation, scheduledStart, invalidEnd, 4),
      ).toThrow('Scheduled end must be after scheduled start');
    });

    it('should throw error for invalid address', () => {
      expect(() =>
        Booking.create(customerId, 'abc', serviceLocation, scheduledStart, scheduledEnd, 4),
      ).toThrow('Service location address must be at least 5 characters');
    });
  });

  describe('assignGuard', () => {
    it('should assign guard and transition to MATCHED status', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);

      expect(booking.getStatus()).toBe(BookingStatus.MATCHED);
      expect(booking.getGuardId()).toEqual(guardId);
      expect(booking.getHourlyRate()).toEqual(hourlyRate);
      expect(booking.getEstimatedTotal()?.getAmount()).toBe(200); // 50 * 4 hours
    });

    it('should throw error when assigning guard in non-REQUESTED status', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);

      // Try to assign again
      expect(() => booking.assignGuard(guardId, hourlyRate)).toThrow(
        'Cannot assign guard in status: matched',
      );
    });
  });

  describe('acceptByGuard', () => {
    it('should transition from MATCHED to ACCEPTED', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);
      booking.acceptByGuard();

      expect(booking.getStatus()).toBe(BookingStatus.ACCEPTED);
    });

    it('should throw error when accepting in non-MATCHED status', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      expect(() => booking.acceptByGuard()).toThrow('Cannot accept booking in status: requested');
    });
  });

  describe('startJob', () => {
    it('should transition from ACCEPTED to IN_PROGRESS', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);
      booking.acceptByGuard();
      booking.startJob();

      expect(booking.getStatus()).toBe(BookingStatus.IN_PROGRESS);
      expect(booking.getActualStart()).toBeDefined();
    });

    it('should throw error when starting in non-ACCEPTED status', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      expect(() => booking.startJob()).toThrow('Cannot start job in status: requested');
    });
  });

  describe('completeJob', () => {
    it('should transition from IN_PROGRESS to COMPLETED', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);
      booking.acceptByGuard();
      booking.startJob();
      booking.completeJob();

      expect(booking.getStatus()).toBe(BookingStatus.COMPLETED);
      expect(booking.getActualEnd()).toBeDefined();
      expect(booking.isCompleted()).toBe(true);
    });

    it('should throw error when completing in non-IN_PROGRESS status', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      expect(() => booking.completeJob()).toThrow('Cannot complete job in status: requested');
    });
  });

  describe('cancel', () => {
    it('should cancel booking in REQUESTED status', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      booking.cancel();
      expect(booking.getStatus()).toBe(BookingStatus.CANCELLED);
      expect(booking.isCancelled()).toBe(true);
    });

    it('should cancel booking in MATCHED status', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);
      booking.cancel();

      expect(booking.getStatus()).toBe(BookingStatus.CANCELLED);
    });

    it('should throw error when cancelling completed booking', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);
      booking.acceptByGuard();
      booking.startJob();
      booking.completeJob();

      expect(() => booking.cancel()).toThrow('Cannot cancel booking in status: completed');
    });
  });

  describe('getActualDuration', () => {
    it('should calculate actual duration in hours', (done) => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);
      booking.acceptByGuard();
      booking.startJob();

      // Wait 100ms before completing
      setTimeout(() => {
        booking.completeJob();
        const duration = booking.getActualDuration();
        expect(duration).toBeDefined();
        expect(duration!).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should return undefined when job not completed', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      expect(booking.getActualDuration()).toBeUndefined();
    });
  });

  describe('calculateFinalAmount', () => {
    it('should calculate final amount based on actual hours', (done) => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);
      booking.acceptByGuard();
      booking.startJob();

      setTimeout(() => {
        booking.completeJob();
        const finalAmount = booking.calculateFinalAmount();
        expect(finalAmount).toBeDefined();
        expect(finalAmount!.getCurrency()).toBe('USD');
        done();
      }, 100);
    });
  });

  describe('isActive', () => {
    it('should return true for active statuses', () => {
      const booking = Booking.create(
        customerId,
        '123 Main St, New York, NY',
        serviceLocation,
        scheduledStart,
        scheduledEnd,
        4,
      );

      expect(booking.isActive()).toBe(true);

      const hourlyRate = new Money(50, 'USD');
      booking.assignGuard(guardId, hourlyRate);
      expect(booking.isActive()).toBe(true);

      booking.acceptByGuard();
      expect(booking.isActive()).toBe(true);

      booking.startJob();
      expect(booking.isActive()).toBe(true);

      booking.completeJob();
      expect(booking.isActive()).toBe(false);
    });
  });
});
