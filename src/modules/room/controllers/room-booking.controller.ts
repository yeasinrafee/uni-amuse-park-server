import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RoomBookingService } from '../services/room-booking.service';
import { CreateRoomBookingDto, CreateUserRoomBookingDto, UpdateRoomBookingStatusDto, UpdateRoomBookingPaymentDto } from '../dto/room-booking.dto';

@Controller('room-bookings')
export class RoomBookingController {
  constructor(private readonly roomBookingService: RoomBookingService) {}

  @Post()
  async create(@Body() createRoomBookingDto: CreateRoomBookingDto) {
    const booking = await this.roomBookingService.create(createRoomBookingDto);
    return { message: 'Room booking created successfully', booking };
  }

  @Get()
  async findAll() {
    const bookings = await this.roomBookingService.findAll();
    return { message: 'Room bookings fetched successfully', bookings };
  }

  @Get('available-rooms')
  async getAvailableRooms(
    @Query('checkinDate') checkinDate: string,
    @Query('checkoutDate') checkoutDate: string,
  ) {
    const rooms = await this.roomBookingService.getAvailableRooms(checkinDate, checkoutDate);
    return { message: 'Available rooms fetched successfully', rooms };
  }

  @Post('user')
  async createByUser(@Body() createUserRoomBookingDto: CreateUserRoomBookingDto) {
    const booking = await this.roomBookingService.createByUser(createUserRoomBookingDto);
    return { message: 'Room booking created successfully', booking };
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    const bookings = await this.roomBookingService.findByUserId(userId);
    return { message: 'User room bookings fetched successfully', bookings };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const booking = await this.roomBookingService.findOne(id);
    return { message: 'Room booking fetched successfully', booking };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() updateDto: UpdateRoomBookingStatusDto) {
    const booking = await this.roomBookingService.updateStatus(id, updateDto);
    return { message: 'Room booking status updated successfully', booking };
  }

  @Patch(':id/payment')
  async updatePayment(@Param('id') id: string, @Body() updateDto: UpdateRoomBookingPaymentDto) {
    const booking = await this.roomBookingService.updatePayment(id, updateDto);
    return { message: 'Room booking payment updated successfully', booking };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.roomBookingService.remove(id);
    return { message: 'Room booking deleted successfully', id };
  }
}
