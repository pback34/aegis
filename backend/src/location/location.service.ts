import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor() {
    this.logger.log('LocationService initialized - TODO: Implement location tracking');
  }

  // TODO: Implement location tracking methods
}
