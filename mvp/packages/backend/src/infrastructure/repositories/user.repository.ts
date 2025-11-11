import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '../../application/ports/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { Customer } from '../../domain/entities/customer.entity';
import { Guard } from '../../domain/entities/guard.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserId } from '../../domain/value-objects/user-id.value-object';
import { UserEntity } from '../database/entities/user.entity';
import { GuardProfileEntity } from '../database/entities/guard-profile.entity';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GuardProfileEntity)
    private readonly guardProfileRepository: Repository<GuardProfileEntity>,
  ) {}

  async save(user: User): Promise<User> {
    const { user: userEntity, guardProfile } = UserMapper.toPersistence(user);

    // Save user entity
    const savedUser = await this.userRepository.save(userEntity);

    // If guard, save guard profile
    if (guardProfile && user instanceof Guard) {
      await this.guardProfileRepository.save(guardProfile);
    }

    // Reload with relations
    return this.findById(user.getId());
  }

  async findById(id: UserId): Promise<User | null> {
    const userEntity = await this.userRepository.findOne({
      where: { id: id.getValue() },
      relations: ['guardProfile'],
    });

    if (!userEntity) {
      return null;
    }

    return UserMapper.toDomain(userEntity, userEntity.guardProfile);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const userEntity = await this.userRepository.findOne({
      where: { email: email.getValue() },
      relations: ['guardProfile'],
    });

    if (!userEntity) {
      return null;
    }

    return UserMapper.toDomain(userEntity, userEntity.guardProfile);
  }

  async update(user: User): Promise<User> {
    const { user: userEntity, guardProfile } = UserMapper.toPersistence(user);

    await this.userRepository.update(user.getId().getValue(), userEntity);

    if (guardProfile && user instanceof Guard) {
      await this.guardProfileRepository.save(guardProfile);
    }

    return this.findById(user.getId());
  }

  async delete(id: UserId): Promise<void> {
    await this.userRepository.delete(id.getValue());
  }

  async findAllGuards(): Promise<Guard[]> {
    const guardEntities = await this.userRepository.find({
      where: { role: 'guard' },
      relations: ['guardProfile'],
    });

    return guardEntities.map((entity) =>
      UserMapper.toDomain(entity, entity.guardProfile),
    ) as Guard[];
  }

  async findAvailableGuards(): Promise<Guard[]> {
    const guardEntities = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.guardProfile', 'profile')
      .where('user.role = :role', { role: 'guard' })
      .andWhere('profile.is_available = :available', { available: true })
      .getMany();

    return guardEntities.map((entity) =>
      UserMapper.toDomain(entity, entity.guardProfile),
    ) as Guard[];
  }

  async findGuardById(id: UserId): Promise<Guard | null> {
    const user = await this.findById(id);
    return user instanceof Guard ? user : null;
  }

  async findCustomerById(id: UserId): Promise<Customer | null> {
    const user = await this.findById(id);
    return user instanceof Customer ? user : null;
  }

  async updateGuardLocation(guard: Guard): Promise<Guard> {
    return this.update(guard) as Promise<Guard>;
  }
}
