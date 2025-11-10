import { Money } from '../value-objects';

export interface PricingCalculation {
  subtotal: Money;
  platformFee: Money;
  total: Money;
  guardPayout: Money;
}

export class PricingService {
  private readonly defaultPlatformFeePercentage: number;

  constructor(platformFeePercentage: number = 20) {
    if (platformFeePercentage < 0 || platformFeePercentage > 100) {
      throw new Error('Platform fee percentage must be between 0 and 100');
    }
    this.defaultPlatformFeePercentage = platformFeePercentage;
  }

  /**
   * Calculate total booking cost based on hourly rate and estimated hours
   * @param hourlyRate Guard's hourly rate
   * @param estimatedHours Estimated duration of the booking
   * @param platformFeePercentage Optional custom platform fee percentage
   * @returns Pricing breakdown
   */
  calculateBookingCost(
    hourlyRate: Money,
    estimatedHours: number,
    platformFeePercentage?: number,
  ): PricingCalculation {
    if (estimatedHours <= 0) {
      throw new Error('Estimated hours must be greater than 0');
    }

    const feePercentage = platformFeePercentage ?? this.defaultPlatformFeePercentage;

    if (feePercentage < 0 || feePercentage > 100) {
      throw new Error('Platform fee percentage must be between 0 and 100');
    }

    // Calculate subtotal (what the guard earns)
    const subtotal = hourlyRate.multiply(estimatedHours);

    // Calculate platform fee
    const platformFee = subtotal.percentage(feePercentage);

    // Calculate total (what customer pays)
    const total = subtotal.add(platformFee);

    return {
      subtotal,
      platformFee,
      total,
      guardPayout: subtotal,
    };
  }

  /**
   * Calculate actual cost based on actual hours worked
   * @param hourlyRate Guard's hourly rate
   * @param actualHours Actual duration of the booking
   * @param platformFeePercentage Optional custom platform fee percentage
   * @returns Pricing breakdown
   */
  calculateActualCost(
    hourlyRate: Money,
    actualHours: number,
    platformFeePercentage?: number,
  ): PricingCalculation {
    return this.calculateBookingCost(hourlyRate, actualHours, platformFeePercentage);
  }

  /**
   * Calculate guard payout from a total amount
   * @param totalAmount Total amount paid by customer
   * @param platformFeePercentage Platform fee percentage
   * @returns Guard payout amount
   */
  calculateGuardPayout(totalAmount: Money, platformFeePercentage?: number): Money {
    const feePercentage = platformFeePercentage ?? this.defaultPlatformFeePercentage;

    if (feePercentage < 0 || feePercentage > 100) {
      throw new Error('Platform fee percentage must be between 0 and 100');
    }

    const platformFee = totalAmount.percentage(feePercentage);
    return totalAmount.subtract(platformFee);
  }

  /**
   * Calculate platform fee from a total amount
   * @param totalAmount Total amount paid by customer
   * @param platformFeePercentage Platform fee percentage
   * @returns Platform fee amount
   */
  calculatePlatformFee(totalAmount: Money, platformFeePercentage?: number): Money {
    const feePercentage = platformFeePercentage ?? this.defaultPlatformFeePercentage;

    if (feePercentage < 0 || feePercentage > 100) {
      throw new Error('Platform fee percentage must be between 0 and 100');
    }

    return totalAmount.percentage(feePercentage);
  }

  /**
   * Calculate minimum booking amount based on minimum hours
   * @param hourlyRate Guard's hourly rate
   * @param minimumHours Minimum hours required
   * @returns Minimum booking amount
   */
  calculateMinimumBookingAmount(hourlyRate: Money, minimumHours: number = 2): Money {
    if (minimumHours <= 0) {
      throw new Error('Minimum hours must be greater than 0');
    }

    const calculation = this.calculateBookingCost(hourlyRate, minimumHours);
    return calculation.total;
  }

  /**
   * Validate if a booking amount is reasonable
   * @param amount Booking amount to validate
   * @param hourlyRate Expected hourly rate
   * @param hours Expected hours
   * @param tolerancePercentage Tolerance percentage (default: 10%)
   * @returns True if amount is within tolerance
   */
  validateBookingAmount(
    amount: Money,
    hourlyRate: Money,
    hours: number,
    tolerancePercentage: number = 10,
  ): boolean {
    if (tolerancePercentage < 0 || tolerancePercentage > 100) {
      throw new Error('Tolerance percentage must be between 0 and 100');
    }

    const expectedCost = this.calculateBookingCost(hourlyRate, hours);
    const tolerance = expectedCost.total.percentage(tolerancePercentage);
    const minAmount = expectedCost.total.subtract(tolerance);
    const maxAmount = expectedCost.total.add(tolerance);

    return !amount.lessThan(minAmount) && !amount.greaterThan(maxAmount);
  }

  /**
   * Get the platform fee percentage
   */
  getPlatformFeePercentage(): number {
    return this.defaultPlatformFeePercentage;
  }
}
