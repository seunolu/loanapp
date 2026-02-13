import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationQueryDto } from '../../../common/pagination/dto/cursor-pagination-query.dto';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ListAdminBorrowersQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by phone/firstName/lastName' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
