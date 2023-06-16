import { NestFactory } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import { swaggerSetup } from './swagger/index';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  swaggerSetup(app);
  app.enableCors();
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  await app.listen(process.env.APP_PORT);
}
bootstrap();
