import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';
import { TokenAnalyticsPage } from '@/pages/token-analytics';

export const tokenAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/token-analytics',
  component: TokenAnalyticsPage,
});
