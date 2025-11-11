import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('bookings')
export class BookingEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'uuid', nullable: true })
  guard_id: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['requested', 'matched', 'accepted', 'in_progress', 'completed', 'cancelled'],
  })
  status: string;

  @Column({ type: 'text' })
  service_location_address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  service_location_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  service_location_lng: number;

  @Column({ type: 'timestamp' })
  scheduled_start: Date;

  @Column({ type: 'timestamp' })
  scheduled_end: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_start: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_end: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourly_rate: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  estimated_hours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimated_total: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'guard_id' })
  guard: UserEntity;
}
