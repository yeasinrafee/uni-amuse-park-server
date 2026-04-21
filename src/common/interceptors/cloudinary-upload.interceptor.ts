import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CloudinaryService } from '../../modules/cloudinary/cloudinary.service';

@Injectable()
export class CloudinaryUploadInterceptor implements NestInterceptor {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (file) {
      try {
        const result = await this.cloudinaryService.uploadFile(file);
        // Assuming the file URL needs to be added to the DTO as 'image'
        request.body.image = result.secure_url;
      } catch (error) {
        require('fs').appendFileSync('cloudinary_error.log', JSON.stringify(error, null, 2) + '\\n');
        throw new BadRequestException('Failed to upload image to Cloudinary');
      }
    }

    return next.handle();
  }
}
