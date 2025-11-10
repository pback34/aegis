export class GeoLocation {
  private readonly latitude: number;
  private readonly longitude: number;

  constructor(latitude: number, longitude: number) {
    if (!this.isValidLatitude(latitude)) {
      throw new Error('Invalid latitude: must be between -90 and 90');
    }
    if (!this.isValidLongitude(longitude)) {
      throw new Error('Invalid longitude: must be between -180 and 180');
    }
    // Round to 8 decimal places (~1.1mm precision)
    this.latitude = Math.round(latitude * 100000000) / 100000000;
    this.longitude = Math.round(longitude * 100000000) / 100000000;
  }

  private isValidLatitude(lat: number): boolean {
    return lat >= -90 && lat <= 90;
  }

  private isValidLongitude(lng: number): boolean {
    return lng >= -180 && lng <= 180;
  }

  getLatitude(): number {
    return this.latitude;
  }

  getLongitude(): number {
    return this.longitude;
  }

  /**
   * Calculate distance to another location using Haversine formula
   * @param other Another GeoLocation
   * @returns Distance in kilometers
   */
  distanceTo(other: GeoLocation): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(other.latitude - this.latitude);
    const dLon = this.toRadians(other.longitude - this.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this.latitude)) *
        Math.cos(this.toRadians(other.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  equals(other: GeoLocation): boolean {
    return this.latitude === other.latitude && this.longitude === other.longitude;
  }

  toString(): string {
    return `${this.latitude}, ${this.longitude}`;
  }

  toJSON(): { latitude: number; longitude: number } {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}
