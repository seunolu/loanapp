import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'ops1@acme.test' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  roleId!: string;
}
