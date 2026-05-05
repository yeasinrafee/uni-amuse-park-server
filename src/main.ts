import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable body parsing for URL-encoded data (Required for SSLCommerz)
  const express = require('express');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Enable global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Enable CORS with explicit origins for ngrok compatibility
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Optional: global prefix (e.g., /api)
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api`);
}

bootstrap();
