import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(AllExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    console.log("exception => ", exception)
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    // console.log("res => ", res);

    const code = res?.statusCode ?? 500;
    return res.status(code).json({
      code,
      time: new Date().toISOString(),
      path: `${req.method} ${req.url}`,
      data: exception.message ?? exception,
    });

    // const code =
    //   exception instanceof HttpException
    //     ? exception.getStatus()
    //     : HttpStatus.INTERNAL_SERVER_ERROR;
        
    // const data =
    //   exception instanceof HttpException
    //     ? (exception.getResponse() as any)?.message ?? exception.getResponse()
    //     : exception.message ?? exception;

    // if (code >= 500)
    //   this.log.error(
    //     `[${code}]: ${JSON.stringify(data)} | ${req?.method} ${req.url} | ${
    //       req?.headers?.['x-real-ip'] ?? 'NoIP'
    //     }`,
    //   );
    // return res
    //   .status(code)
    //   .json({
    //     code,
    //     time: new Date().toISOString(),
    //     path: `${req.method} ${req.url}`,
    //     data,
    //   });
  }
}
