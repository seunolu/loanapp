import { Body, Controller, Post } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Idempotent } from '../../common/idempotency/idempotency.decorator';

class IdempotencyDemoDto {
  @IsString()
  @IsOptional()
  note?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  amount?: number;
}

type IdempotencyDemoResponse = {
  status: 'ok';
  execution: number;
  echo: IdempotencyDemoDto;
};

@Controller('dev')
export class DevIdempotencyController {
  private executionCount = 0;

  // Dev-only endpoint used to verify idempotency behavior.
  @Post('idempotency-demo')
  @Idempotent()
  runDemo(@Body() body: IdempotencyDemoDto): IdempotencyDemoResponse {
    this.executionCount += 1;

    return {
      status: 'ok',
      execution: this.executionCount,
      echo: body
    };
  }
}
