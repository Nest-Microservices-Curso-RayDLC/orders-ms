import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrderItemDto } from "./order-item.dto";

export class CreateOrderDto {

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    // @IsNotEmpty()
    // @IsPositive()
    // totalAmount: number;

    // @IsNotEmpty()
    // @IsPositive()
    // totalItems: number;

    // @IsOptional()
    // @IsEnum(OrderStatusList, { 
    //     message: `Possible values are ${OrderStatusList}`
    // })
    // status: OrderStatus = OrderStatus.PENDING;

    // @IsOptional()
    // @IsBoolean()
    // paid: boolean = false;

}
