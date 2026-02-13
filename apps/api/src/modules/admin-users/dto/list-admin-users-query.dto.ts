import { IntersectionType } from '@nestjs/swagger';
import { CommonFilterQueryDto } from '../../../common/pagination/dto/common-filter-query.dto';
import { CursorPaginationQueryDto } from '../../../common/pagination/dto/cursor-pagination-query.dto';

export class ListAdminUsersQueryDto extends IntersectionType(CursorPaginationQueryDto, CommonFilterQueryDto) {}
