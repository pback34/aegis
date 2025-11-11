import {
  Entity,
  Column,
  PrimaryColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('guard_profiles')
export class GuardProfileEntity {
  @PrimaryColumn('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  license_number: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourly_rate: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ type: 'boolean', default: false })
  is_available: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  current_latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  current_longitude: number | null;

  @Column({ type: 'timestamp', nullable: true })
  last_location_update: Date | null;

  @OneToOne(() => UserEntity, (user) => user.guardProfile)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
