/**
 * Loading skeleton components for various UI states.
 * These provide visual feedback while async operations are in progress.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Skeleton for a single panel (Summary, Insights, or Alignment).
 * Shows animated placeholder bars that mimic the actual content layout.
 */
export function PanelSkeleton() {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-1 duration-200">
      <CardHeader>
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for list items (dashboard interviews, customer profiles).
 * Shows multiple placeholder rows.
 */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-in fade-in duration-200">
          <CardContent className="p-4 space-y-2">
            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton for the optional actions section (coaching, questions, email).
 */
export function OptionalSkeleton() {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-1 duration-200">
      <CardHeader>
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
