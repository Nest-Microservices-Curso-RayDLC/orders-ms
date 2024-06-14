import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
    catch(exception: RpcException, host: ArgumentsHost){
        console.log("exception => ", exception.getError())
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const rpcError = exception.getError();
        if(typeof rpcError === 'object' && 'status' in rpcError && 'message' in rpcError){
            const status = isNaN(+rpcError.status) ? 400 : +rpcError.status;
            return response.status(status).json({
                code: status,
                time: new Date().toISOString(),
                path: `${response.req.method} ${response.req.url}`,
                data: rpcError.message,
            });
        }
        
        response(400).json({
            code: 400,
            time: new Date().toISOString(),
            path: `${response.req.method} ${response.req.url}`,
            data: rpcError,
        })
    }
}