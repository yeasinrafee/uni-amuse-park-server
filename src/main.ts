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
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        /\.ngrok-free\.app$/,
        /\.ngrok-free\.dev$/
      ];

      const isAllowed = allowedOrigins.some(pattern => 
        typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true); // During development with ngrok, we can be more permissive if needed
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, ngrok-skip-browser-warning',
  });

  // Optional: global prefix (e.g., /api)
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api`);
}

bootstrap();
