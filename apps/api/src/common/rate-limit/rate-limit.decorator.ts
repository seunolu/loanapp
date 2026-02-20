import { SetMetadata } from '@nestjs/common';
import type { RateLimitCategory } from './rate-limit.policy';

export const RATE_LIMIT_CATEGORY_META = 'rate_limit_category';

export const RateLimit = (category: RateLimitCategory) => SetMetadata(RATE_LIMIT_CATEGORY_META, category);

