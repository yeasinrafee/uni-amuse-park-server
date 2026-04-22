import { IsNotEmpty, IsString, IsDateString } from "class-validator";

export class CreateOpeningDto {
    @IsNotEmpty()
    @IsString()
    day!: string;

    @IsNotEmpty()
    @IsDateString()
    startTime!: Date;

    @IsNotEmpty()
    @IsDateString()
    endTime!: Date;
}