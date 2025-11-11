import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { UserEntity } from './user.entity';

@Entity('location_updates')
@Index(['booking_id', 'timestamp'])
export class LocationUpdateEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  booking_id: string;

  @Column({ type: 'uuid' })
  guard_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  accuracy_meters: number | null;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'guard_id' })
  guard: UserEntity;
}
