import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPaymentRepository } from '../../application/ports/payment.repository.interface';
import { Payment, PaymentStatus } from '../../domain/entities/payment.entity';
import { UserId } from '../../domain/value-objects/user-id.value-object';
import { PaymentEntity } from '../database/entities/payment.entity';
import { PaymentMapper } from './mappers/payment.mapper';

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
  ) {}

  async save(payment: Payment): Promise<Payment> {
    const paymentEntity = PaymentMapper.toPersistence(payment);
    const saved = await this.paymentRepository.save(paymentEntity);
    return PaymentMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Payment | null> {
    const paymentEntity = await this.paymentRepository.findOne({
      where: { id },
    });

    if (!paymentEntity) {
      return null;
    }

    return PaymentMapper.toDomain(paymentEntity);
  }

  async update(payment: Payment): Promise<Payment> {
    const paymentEntity = PaymentMapper.toPersistence(payment);
    await this.paymentRepository.update(payment.getId(), paymentEntity);
    const updated = await this.findById(payment.getId());
    if (!updated) {
      throw new Error(`Payment ${payment.getId()} not found after update`);
    }
    return updated;
  }

  async findByBookingId(bookingId: string): Promise<Payment | null> {
    const paymentEntity = await this.paymentRepository.findOne({
      where: { booking_id: bookingId },
    });

    if (!paymentEntity) {
      return null;
    }

    return PaymentMapper.toDomain(paymentEntity);
  }

  async findByCustomerId(customerId: UserId): Promise<Payment[]> {
    const paymentEntities = await this.paymentRepository.find({
      where: { customer_id: customerId.getValue() },
      order: { created_at: 'DESC' },
    });

    return paymentEntities.map((entity) => PaymentMapper.toDomain(entity));
  }

  async findByGuardId(guardId: UserId): Promise<Payment[]> {
    const paymentEntities = await this.paymentRepository.find({
      where: { guard_id: guardId.getValue() },
      order: { created_at: 'DESC' },
    });

    return paymentEntities.map((entity) => PaymentMapper.toDomain(entity));
  }

  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    const paymentEntities = await this.paymentRepository.find({
      where: { status },
      order: { created_at: 'DESC' },
    });

    return paymentEntities.map((entity) => PaymentMapper.toDomain(entity));
  }

  async findByStripePaymentIntentId(
    stripePaymentIntentId: string,
  ): Promise<Payment | null> {
    const paymentEntity = await this.paymentRepository.findOne({
      where: { stripe_payment_intent_id: stripePaymentIntentId },
    });

    if (!paymentEntity) {
      return null;
    }

    return PaymentMapper.toDomain(paymentEntity);
  }
}
