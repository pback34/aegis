import { GeoLocation } from './geo-location.value-object';

describe('GeoLocation Value Object', () => {
  describe('constructor', () => {
    it('should create valid geolocation', () => {
      const location = new GeoLocation(40.7128, -74.0060);
      expect(location.getLatitude()).toBe(40.7128);
      expect(location.getLongitude()).toBe(-74.0060);
    });

    it('should round coordinates to 8 decimal places', () => {
      const location = new GeoLocation(40.712812345, -74.006012345);
      expect(location.getLatitude()).toBe(40.71281235);
      expect(location.getLongitude()).toBe(-74.00601235);
    });

    it('should throw error for invalid latitude', () => {
      expect(() => new GeoLocation(91, 0)).toThrow('Invalid latitude');
      expect(() => new GeoLocation(-91, 0)).toThrow('Invalid latitude');
    });

    it('should throw error for invalid longitude', () => {
      expect(() => new GeoLocation(0, 181)).toThrow('Invalid longitude');
      expect(() => new GeoLocation(0, -181)).toThrow('Invalid longitude');
    });

    it('should accept boundary values', () => {
      expect(() => new GeoLocation(90, 180)).not.toThrow();
      expect(() => new GeoLocation(-90, -180)).not.toThrow();
      expect(() => new GeoLocation(0, 0)).not.toThrow();
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance between two locations', () => {
      // New York to Los Angeles (approximately 3944 km)
      const newYork = new GeoLocation(40.7128, -74.0060);
      const losAngeles = new GeoLocation(34.0522, -118.2437);
      const distance = newYork.distanceTo(losAngeles);

      // Allow some tolerance due to rounding
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should return 0 for same location', () => {
      const location1 = new GeoLocation(40.7128, -74.0060);
      const location2 = new GeoLocation(40.7128, -74.0060);
      const distance = location1.distanceTo(location2);
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Two points approximately 1 km apart
      const point1 = new GeoLocation(40.7128, -74.0060);
      const point2 = new GeoLocation(40.7218, -74.0060);
      const distance = point1.distanceTo(point2);

      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });

    it('should be symmetric', () => {
      const point1 = new GeoLocation(40.7128, -74.0060);
      const point2 = new GeoLocation(34.0522, -118.2437);

      const distance1 = point1.distanceTo(point2);
      const distance2 = point2.distanceTo(point1);

      expect(distance1).toBe(distance2);
    });
  });

  describe('equals', () => {
    it('should return true for equal locations', () => {
      const location1 = new GeoLocation(40.7128, -74.0060);
      const location2 = new GeoLocation(40.7128, -74.0060);
      expect(location1.equals(location2)).toBe(true);
    });

    it('should return false for different locations', () => {
      const location1 = new GeoLocation(40.7128, -74.0060);
      const location2 = new GeoLocation(34.0522, -118.2437);
      expect(location1.equals(location2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format as string', () => {
      const location = new GeoLocation(40.7128, -74.0060);
      expect(location.toString()).toBe('40.7128, -74.006');
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON object', () => {
      const location = new GeoLocation(40.7128, -74.0060);
      const json = location.toJSON();
      expect(json).toEqual({ latitude: 40.7128, longitude: -74.006 });
    });
  });
});
