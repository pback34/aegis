import { Money } from './money.value-object';

describe('Money Value Object', () => {
  describe('constructor', () => {
    it('should create money with valid amount', () => {
      const money = new Money(100.50, 'USD');
      expect(money.getAmount()).toBe(100.50);
      expect(money.getCurrency()).toBe('USD');
    });

    it('should default to USD currency', () => {
      const money = new Money(50);
      expect(money.getCurrency()).toBe('USD');
    });

    it('should uppercase currency code', () => {
      const money = new Money(100, 'usd');
      expect(money.getCurrency()).toBe('USD');
    });

    it('should round to 2 decimal places', () => {
      const money = new Money(100.556, 'USD');
      expect(money.getAmount()).toBe(100.56);
    });

    it('should throw error for negative amount', () => {
      expect(() => new Money(-10, 'USD')).toThrow('Money amount cannot be negative');
    });

    it('should throw error for invalid currency code', () => {
      expect(() => new Money(100, 'US')).toThrow('Currency code must be 3 characters');
      expect(() => new Money(100, 'USDD')).toThrow('Currency code must be 3 characters');
    });

    it('should allow zero amount', () => {
      const money = new Money(0, 'USD');
      expect(money.getAmount()).toBe(0);
    });
  });

  describe('add', () => {
    it('should add two money amounts with same currency', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(50, 'USD');
      const result = money1.add(money2);
      expect(result.getAmount()).toBe(150);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should throw error when adding different currencies', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(50, 'EUR');
      expect(() => money1.add(money2)).toThrow('Cannot operate on different currencies');
    });
  });

  describe('subtract', () => {
    it('should subtract two money amounts with same currency', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(30, 'USD');
      const result = money1.subtract(money2);
      expect(result.getAmount()).toBe(70);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should throw error when subtracting different currencies', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(50, 'EUR');
      expect(() => money1.subtract(money2)).toThrow('Cannot operate on different currencies');
    });

    it('should throw error when subtraction would result in negative', () => {
      const money1 = new Money(50, 'USD');
      const money2 = new Money(100, 'USD');
      expect(() => money1.subtract(money2)).toThrow('Subtraction would result in negative amount');
    });
  });

  describe('multiply', () => {
    it('should multiply money by factor', () => {
      const money = new Money(50, 'USD');
      const result = money.multiply(3);
      expect(result.getAmount()).toBe(150);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should handle decimal multipliers', () => {
      const money = new Money(100, 'USD');
      const result = money.multiply(0.5);
      expect(result.getAmount()).toBe(50);
    });

    it('should throw error for negative multiplier', () => {
      const money = new Money(100, 'USD');
      expect(() => money.multiply(-2)).toThrow('Multiplication factor cannot be negative');
    });
  });

  describe('percentage', () => {
    it('should calculate percentage of amount', () => {
      const money = new Money(100, 'USD');
      const result = money.percentage(20);
      expect(result.getAmount()).toBe(20);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should handle decimal results', () => {
      const money = new Money(100, 'USD');
      const result = money.percentage(15);
      expect(result.getAmount()).toBe(15);
    });

    it('should throw error for percentage < 0', () => {
      const money = new Money(100, 'USD');
      expect(() => money.percentage(-10)).toThrow('Percentage must be between 0 and 100');
    });

    it('should throw error for percentage > 100', () => {
      const money = new Money(100, 'USD');
      expect(() => money.percentage(110)).toThrow('Percentage must be between 0 and 100');
    });
  });

  describe('equals', () => {
    it('should return true for equal money amounts', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(100, 'USD');
      expect(money1.equals(money2)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(50, 'USD');
      expect(money1.equals(money2)).toBe(false);
    });

    it('should return false for different currencies', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(100, 'EUR');
      expect(money1.equals(money2)).toBe(false);
    });
  });

  describe('greaterThan and lessThan', () => {
    it('should compare amounts correctly', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(50, 'USD');
      expect(money1.greaterThan(money2)).toBe(true);
      expect(money2.lessThan(money1)).toBe(true);
    });

    it('should throw error when comparing different currencies', () => {
      const money1 = new Money(100, 'USD');
      const money2 = new Money(50, 'EUR');
      expect(() => money1.greaterThan(money2)).toThrow('Cannot operate on different currencies');
      expect(() => money1.lessThan(money2)).toThrow('Cannot operate on different currencies');
    });
  });

  describe('toString', () => {
    it('should format money as string', () => {
      const money = new Money(100.50, 'USD');
      expect(money.toString()).toBe('USD 100.50');
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON object', () => {
      const money = new Money(100.50, 'USD');
      const json = money.toJSON();
      expect(json).toEqual({ amount: 100.50, currency: 'USD' });
    });
  });
});
