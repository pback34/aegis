import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Transform payloads to DTO instances
    }),
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api', {
    exclude: ['health'], // Exclude health check from prefix
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Aegis MVP Backend is running on: http://localhost:${port}`);
  console.log(`📚 API available at: http://localhost:${port}/api`);
}

bootstrap();
