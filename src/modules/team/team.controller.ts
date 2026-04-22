import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.teamService.create(createTeamDto, file);
    return {
      success: true,
      message: 'Team member created successfully',
      data: result,
    };
  }

  @Get()
  async findAll() {
    const result = await this.teamService.findAll();
    return {
      success: true,
      message: 'Team members retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.teamService.findOne(id);
    return {
      success: true,
      message: 'Team member retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.teamService.updateTeamMember(
      id,
      updateTeamDto,
      file,
    );
    return {
      success: true,
      message: 'Team member updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = await this.teamService.delete(id);
    return {
      success: true,
      message: 'Team member deleted successfully',
      data: result,
    };
  }
}
