import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketService } from './ticket.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { CreateTicketBookingDto } from './dto/create-ticket-booking.dto';
import { CloudinaryUploadInterceptor } from '../../common/interceptors/cloudinary-upload.interceptor';

import { UpdateTicketBookingStatusDto } from './dto/update-ticket-booking-status.dto';

@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post('ticket-types')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'), CloudinaryUploadInterceptor)
  async createTicketType(@Body() createTicketTypeDto: CreateTicketTypeDto) {
    if (createTicketTypeDto.price) {
      createTicketTypeDto.price = Number(createTicketTypeDto.price);
    }
    const ticketType =
      await this.ticketService.createTicketType(createTicketTypeDto);

    return {
      message: 'Ticket type created successfully',
      ticketType,
    };
  }

  @Patch('ticket-types/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'), CloudinaryUploadInterceptor)
  async updateTicketType(
    @Param('id') id: string,
    @Body() updateTicketTypeDto: UpdateTicketTypeDto,
  ) {
    if (updateTicketTypeDto.price) {
      updateTicketTypeDto.price = Number(updateTicketTypeDto.price);
    }
    const ticketType = await this.ticketService.updateTicketType(
      id,
      updateTicketTypeDto,
    );

    return {
      message: 'Ticket type updated successfully',
      ticketType,
    };
  }

  @Get('ticket-types')
  @HttpCode(HttpStatus.OK)
  async getAllTicketTypes() {
    const ticketTypes = await this.ticketService.getAllTicketTypes();
    return {
      message: 'Ticket types fetched successfully',
      ticketTypes,
    };
  }

  @Post('ticket-bookings')
  @HttpCode(HttpStatus.CREATED)
  async createTicketBooking(
    @Body() createTicketBookingDto: CreateTicketBookingDto,
  ) {
    const ticketBooking = await this.ticketService.createTicketBooking(
      createTicketBookingDto,
    );
    return {
      message: 'Ticket booking created successfully',
      ticketBooking,
    };
  }

  @Get('ticket-bookings')
  @HttpCode(HttpStatus.OK)
  async getAllTicketBookings() {
    const ticketBookings = await this.ticketService.getAllTicketBookings();
    return {
      message: 'Ticket bookings fetched successfully',
      ticketBookings,
    };
  }

  @Get('ticket-bookings/user/:userId')
  @HttpCode(HttpStatus.OK)
  async getBookingsByUserId(@Param('userId') userId: string) {
    const ticketBookings = await this.ticketService.getBookingsByUserId(userId);
    return {
      message: 'Ticket bookings for user fetched successfully',
      ticketBookings,
    };
  }

  @Patch('ticket-bookings/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateTicketBookingStatus(
    @Param('id') id: string,
    @Body() updateTicketBookingStatusDto: UpdateTicketBookingStatusDto,
  ) {
    const ticketBooking = await this.ticketService.updateTicketBookingStatus(
      id,
      updateTicketBookingStatusDto,
    );
    return {
      message: 'Ticket booking status updated successfully',
      ticketBooking,
    };
  }

  @Delete('ticket-types/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTicketType(@Param('id') id: string) {
    await this.ticketService.deleteTicketType(id);
    return {
      message: 'Ticket type deleted successfully',
      ticketTypeId: id,
    };
  }

  @Delete('ticket-bookings/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTicketBooking(@Param('id') id: string) {
    await this.ticketService.deleteTicketBooking(id);
    return {
      message: 'Ticket booking deleted successfully',
      ticketBookingId: id,
    };
  }
}
