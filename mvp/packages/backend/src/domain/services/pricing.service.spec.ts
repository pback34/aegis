import { PricingService } from './pricing.service';
import { Money } from '../value-objects';

describe('PricingService', () => {
  let pricingService: PricingService;

  beforeEach(() => {
    pricingService = new PricingService(20); // 20% platform fee
  });

  describe('constructor', () => {
    it('should create pricing service with valid platform fee', () => {
      expect(pricingService.getPlatformFeePercentage()).toBe(20);
    });

    it('should throw error for invalid platform fee percentage', () => {
      expect(() => new PricingService(-10)).toThrow(
        'Platform fee percentage must be between 0 and 100',
      );
      expect(() => new PricingService(110)).toThrow(
        'Platform fee percentage must be between 0 and 100',
      );
    });
  });

  describe('calculateBookingCost', () => {
    it('should calculate booking cost correctly', () => {
      const hourlyRate = new Money(50, 'USD');
      const result = pricingService.calculateBookingCost(hourlyRate, 4);

      // Guard earns: 50 * 4 = 200
      // Platform fee: 200 * 20% = 40
      // Total: 200 + 40 = 240
      expect(result.subtotal.getAmount()).toBe(200);
      expect(result.platformFee.getAmount()).toBe(40);
      expect(result.total.getAmount()).toBe(240);
      expect(result.guardPayout.getAmount()).toBe(200);
    });

    it('should handle decimal hours', () => {
      const hourlyRate = new Money(50, 'USD');
      const result = pricingService.calculateBookingCost(hourlyRate, 2.5);

      expect(result.subtotal.getAmount()).toBe(125);
      expect(result.platformFee.getAmount()).toBe(25);
      expect(result.total.getAmount()).toBe(150);
    });

    it('should allow custom platform fee percentage', () => {
      const hourlyRate = new Money(50, 'USD');
      const result = pricingService.calculateBookingCost(hourlyRate, 4, 25);

      // Guard earns: 200
      // Platform fee: 200 * 25% = 50
      // Total: 250
      expect(result.platformFee.getAmount()).toBe(50);
      expect(result.total.getAmount()).toBe(250);
    });

    it('should throw error for zero or negative hours', () => {
      const hourlyRate = new Money(50, 'USD');
      expect(() => pricingService.calculateBookingCost(hourlyRate, 0)).toThrow(
        'Estimated hours must be greater than 0',
      );
      expect(() => pricingService.calculateBookingCost(hourlyRate, -1)).toThrow(
        'Estimated hours must be greater than 0',
      );
    });

    it('should throw error for invalid custom platform fee', () => {
      const hourlyRate = new Money(50, 'USD');
      expect(() => pricingService.calculateBookingCost(hourlyRate, 4, 110)).toThrow(
        'Platform fee percentage must be between 0 and 100',
      );
    });
  });

  describe('calculateActualCost', () => {
    it('should calculate actual cost based on actual hours', () => {
      const hourlyRate = new Money(50, 'USD');
      const result = pricingService.calculateActualCost(hourlyRate, 3.5);

      expect(result.subtotal.getAmount()).toBe(175);
      expect(result.platformFee.getAmount()).toBe(35);
      expect(result.total.getAmount()).toBe(210);
    });
  });

  describe('calculateGuardPayout', () => {
    it('should calculate guard payout from total amount', () => {
      const totalAmount = new Money(240, 'USD');
      const guardPayout = pricingService.calculateGuardPayout(totalAmount);

      // 240 - (240 * 20%) = 240 - 48 = 192
      expect(guardPayout.getAmount()).toBe(192);
    });

    it('should allow custom platform fee percentage', () => {
      const totalAmount = new Money(250, 'USD');
      const guardPayout = pricingService.calculateGuardPayout(totalAmount, 25);

      // 250 - (250 * 25%) = 250 - 62.5 = 187.5
      expect(guardPayout.getAmount()).toBe(187.50);
    });
  });

  describe('calculatePlatformFee', () => {
    it('should calculate platform fee from total amount', () => {
      const totalAmount = new Money(240, 'USD');
      const platformFee = pricingService.calculatePlatformFee(totalAmount);

      // 240 * 20% = 48
      expect(platformFee.getAmount()).toBe(48);
    });

    it('should allow custom platform fee percentage', () => {
      const totalAmount = new Money(250, 'USD');
      const platformFee = pricingService.calculatePlatformFee(totalAmount, 25);

      // 250 * 25% = 62.5
      expect(platformFee.getAmount()).toBe(62.50);
    });
  });

  describe('calculateMinimumBookingAmount', () => {
    it('should calculate minimum booking amount with default 2 hours', () => {
      const hourlyRate = new Money(50, 'USD');
      const minAmount = pricingService.calculateMinimumBookingAmount(hourlyRate);

      // 50 * 2 = 100
      // 100 + (100 * 20%) = 120
      expect(minAmount.getAmount()).toBe(120);
    });

    it('should calculate minimum booking amount with custom hours', () => {
      const hourlyRate = new Money(50, 'USD');
      const minAmount = pricingService.calculateMinimumBookingAmount(hourlyRate, 3);

      // 50 * 3 = 150
      // 150 + (150 * 20%) = 180
      expect(minAmount.getAmount()).toBe(180);
    });

    it('should throw error for invalid minimum hours', () => {
      const hourlyRate = new Money(50, 'USD');
      expect(() => pricingService.calculateMinimumBookingAmount(hourlyRate, 0)).toThrow(
        'Minimum hours must be greater than 0',
      );
    });
  });

  describe('validateBookingAmount', () => {
    it('should return true for valid booking amount', () => {
      const hourlyRate = new Money(50, 'USD');
      const expectedAmount = new Money(240, 'USD'); // 50 * 4 + 20% fee = 240

      const isValid = pricingService.validateBookingAmount(expectedAmount, hourlyRate, 4);
      expect(isValid).toBe(true);
    });

    it('should return true for amount within tolerance', () => {
      const hourlyRate = new Money(50, 'USD');
      const slightlyHigher = new Money(244, 'USD'); // Within 10% tolerance

      const isValid = pricingService.validateBookingAmount(slightlyHigher, hourlyRate, 4);
      expect(isValid).toBe(true);
    });

    it('should return false for amount outside tolerance', () => {
      const hourlyRate = new Money(50, 'USD');
      const tooHigh = new Money(300, 'USD'); // Way over expected

      const isValid = pricingService.validateBookingAmount(tooHigh, hourlyRate, 4);
      expect(isValid).toBe(false);
    });

    it('should allow custom tolerance percentage', () => {
      const hourlyRate = new Money(50, 'USD');
      const slightlyHigher = new Money(244, 'USD');

      // With 1% tolerance, 244 should be invalid (expected is 240)
      const isValid = pricingService.validateBookingAmount(slightlyHigher, hourlyRate, 4, 1);
      expect(isValid).toBe(false);
    });

    it('should throw error for invalid tolerance percentage', () => {
      const hourlyRate = new Money(50, 'USD');
      const amount = new Money(240, 'USD');

      expect(() => pricingService.validateBookingAmount(amount, hourlyRate, 4, -5)).toThrow(
        'Tolerance percentage must be between 0 and 100',
      );
      expect(() => pricingService.validateBookingAmount(amount, hourlyRate, 4, 110)).toThrow(
        'Tolerance percentage must be between 0 and 100',
      );
    });
  });
});
