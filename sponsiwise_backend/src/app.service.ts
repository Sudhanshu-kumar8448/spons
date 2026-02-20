import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Sponsiwise Backend is running check things are runnig or not';
  }
}
