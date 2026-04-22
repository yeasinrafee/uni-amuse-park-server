import { PartialType } from "@nestjs/mapped-types";
import { CreateOpeningDto } from "./create-opening.dto";

export class UpdateOpeningDto extends PartialType(CreateOpeningDto) {}