import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hashPassword } from 'src/utils/helper';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(payload: CreateUserDto): Promise<User> {
    const passwordHashed = await hashPassword(payload.password);
    const newUser = this.userRepository.create({
      firstname: payload.firstname,
      lastname: payload.lastname,
      email: payload.email,
      password: passwordHashed,
    });
    const createdUser = await this.userRepository.save(newUser);
    delete createdUser.password;
    return createdUser;
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });
    if (!user) {
      throw new UnprocessableEntityException('User Not Found');
    }
    return user;
  }

  async finduserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email: email },
    });
    if (!user) {
      throw new UnprocessableEntityException('User Not Found');
    }
    return user;
  }
}
