import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        // In certain situations `httpAdapter` might not be available checking for it saves us from crashing
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        // Extract detailed validation messages when available (e.g. from ValidationPipe)
        let message: string | string[] = 'Internal server error';
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            if (typeof response === 'object' && response !== null && 'message' in response) {
                message = (response as Record<string, any>).message;
            } else if (typeof response === 'string') {
                message = response;
            } else {
                message = exception.message;
            }
        }

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(ctx.getRequest()),
            message,
        };

        if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(exception);
        } else {
            this.logger.warn(exception);
        }

        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
}
