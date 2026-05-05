import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoomService } from '../services/room.service';
import { CreateRoomDto, UpdateRoomDto } from '../dto/room.dto';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async create(@Body() createRoomDto: CreateRoomDto) {
    const room = await this.roomService.create(createRoomDto);
    return { message: 'Room created successfully', room };
  }

  @Get()
  async findAll() {
    const rooms = await this.roomService.findAll();
    return { message: 'Rooms fetched successfully', rooms };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const room = await this.roomService.findOne(id);
    return { message: 'Room fetched successfully', room };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    const room = await this.roomService.update(id, updateRoomDto);
    return { message: 'Room updated successfully', room };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.roomService.remove(id);
    return { message: 'Room deleted successfully', id };
  }
}
