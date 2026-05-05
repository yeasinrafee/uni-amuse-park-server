import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoomTypeService } from '../services/room-type.service';
import { CreateRoomTypeDto, UpdateRoomTypeDto } from '../dto/room-type.dto';

@Controller('room-types')
export class RoomTypeController {
  constructor(private readonly roomTypeService: RoomTypeService) {}

  @Post()
  async create(@Body() createRoomTypeDto: CreateRoomTypeDto) {
    const roomType = await this.roomTypeService.create(createRoomTypeDto);
    return { message: 'Room type created successfully', roomType };
  }

  @Get()
  async findAll() {
    const roomTypes = await this.roomTypeService.findAll();
    return { message: 'Room types fetched successfully', roomTypes };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const roomType = await this.roomTypeService.findOne(id);
    return { message: 'Room type fetched successfully', roomType };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateRoomTypeDto: UpdateRoomTypeDto) {
    const roomType = await this.roomTypeService.update(id, updateRoomTypeDto);
    return { message: 'Room type updated successfully', roomType };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.roomTypeService.remove(id);
    return { message: 'Room type deleted successfully', id };
  }
}
