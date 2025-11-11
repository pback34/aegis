import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { UserEntity } from '../database/entities/user.entity';
import { GuardProfileEntity } from '../database/entities/guard-profile.entity';
import { BookingEntity } from '../database/entities/booking.entity';
import { LocationUpdateEntity } from '../database/entities/location-update.entity';
import { PaymentEntity } from '../database/entities/payment.entity';

// Load environment variables
config();

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'aegis_mvp',
  entities: [
    UserEntity,
    GuardProfileEntity,
    BookingEntity,
    LocationUpdateEntity,
    PaymentEntity,
  ],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false, // Never use true in production
  logging: process.env.NODE_ENV === 'development',
};

// Export DataSource for migrations
export const AppDataSource = new DataSource(typeOrmConfig);
