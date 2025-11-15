import { SetMetadata } from '@nestjs/common';

export const MENU_SLUG_KEY = 'menuSlug';
export const Menu = (slug: string) => SetMetadata(MENU_SLUG_KEY, slug);
