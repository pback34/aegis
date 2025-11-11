import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { UserEntity } from './user.entity';

@Entity('payments')
export class PaymentEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  booking_id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'uuid' })
  guard_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  platform_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  guard_payout: number;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['pending', 'authorized', 'captured', 'refunded', 'failed'],
  })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_payment_intent_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'guard_id' })
  guard: UserEntity;
}
