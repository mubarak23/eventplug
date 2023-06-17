import { MailerService } from '@nestjs-modules/mailer';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as otp from 'otp-generator';
import { comparePassword, hashPassword } from 'src/utils/helper';
import { Repository } from 'typeorm';
import { VerifyOtpDto } from './dto/verify.dto';
import { Otp } from './entities/otp.entity';
import { IOTPResponse } from './otp.response';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,

    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  private generateOtp(): string {
    const authotp = otp.generate(6, {
      upperCaseAlphabets: true,
      specialChars: false,
    });
    return authotp;
  }

  private async sendMail(email: string, subject: string, html: string) {
    const message = {
      to: email,
      from: this.configService.get<string>('MAIL_USERNAME'),
      subject: `Event Plug: ${subject} `,
      html,
    };
    try {
      await this.mailerService.sendMail(message);
    } catch (err) {
      console.log(err);
      throw new HttpException(
        'something went wrong, please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendOtp(email: string, subject: string): Promise<IOTPResponse> {
    const otp = this.generateOtp();
    const text = `<p>Your OTP code is <b>${otp}</b>, Kindly use it to activate your account.</p>`;

    const hashedOtp = await hashPassword(otp);

    const expiry = new Date(new Date().getTime() + 10 * 60 * 1000);

    await this.saveSignupOtp(email, hashedOtp, expiry);
    await this.sendMail(email, subject, text);
    return {
      message: 'OTP sent successfully',
      status: HttpStatus.CREATED,
    };
  }

  async saveSignupOtp(
    email: string,
    otp: string,
    expiredOn: Date,
  ): Promise<void> {
    const userOtpExist = await this.otpRepository.findOne({
      where: { email: email },
    });

    if (userOtpExist) {
      userOtpExist.otp = otp;
      userOtpExist.expiredOn = expiredOn;
      await this.otpRepository.save(userOtpExist);
    }
    const saveNewOtp = this.otpRepository.create({
      email,
      otp,
      expiredOn,
    });
    await this.otpRepository.save(saveNewOtp);
  }
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<IOTPResponse> {
    const otp = await this.otpRepository.findOneBy({
      email: verifyOtpDto.userEmail,
    });

    if (otp === null || !otp) {
      return {
        message: 'OTP not found',
        status: HttpStatus.NOT_FOUND,
      };
    }

    const optCode = await comparePassword(verifyOtpDto.otp, otp.otp);
    if (otp && !optCode) {
      return {
        message: 'invalid otp',
        status: HttpStatus.NOT_FOUND,
      };
    } else if (otp.expiredOn <= new Date()) {
      return {
        message: 'OTP has expired',
        status: HttpStatus.NOT_FOUND,
      };
    }

    await this.revokeOtp(verifyOtpDto);
    return {
      message: 'OTP verified successfully',
      status: HttpStatus.ACCEPTED,
    };
  }
  async resendOtp(email: string, subject: string): Promise<IOTPResponse> {
    await this.sendOtp(email, subject);
    return {
      message: 'OTP sent successfully',
      status: HttpStatus.CREATED,
    };
  }
  async revokeOtp(verifyOtpDto: VerifyOtpDto): Promise<void> {
    const otp = await this.otpRepository.findOneBy({
      email: verifyOtpDto.userEmail,
    });

    const otpCode = await comparePassword(verifyOtpDto.otp, otp.otp);
    if (!otp || otp === null || !otpCode) {
      throw new HttpException('OTP not found', HttpStatus.NOT_FOUND);
    }
    await this.otpRepository.remove(otp);
  }
}
