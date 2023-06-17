import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'string', nullable: false })
  email: string;

  @Column({ type: 'string', nullable: false })
  otp: string;

  @Column({
    type: 'boolean',
    nullable: true,
    default: false,
  })
  isUsed: boolean;

  @Column({ type: 'timestamp' })
  expiredOn: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated: Date;
}
