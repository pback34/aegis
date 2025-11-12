import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { GuardProfileEntity } from './guard-profile.entity';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['customer', 'guard', 'admin'],
  })
  role: string;

  @Column({ type: 'varchar', length: 255 })
  full_name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_customer_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_connect_account_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => GuardProfileEntity)
  @JoinColumn({ name: 'id', referencedColumnName: 'user_id' })
  guardProfile?: GuardProfileEntity;
}
