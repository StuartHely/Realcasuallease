import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Filter Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-[300px]" />
        </CardContent>
      </Card>

      {/* Centre Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          {/* Heatmap Header Skeleton */}
          <div className="mb-4">
            <Skeleton className="h-6 w-full" />
          </div>

          {/* Heatmap Table Skeleton */}
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-16 w-48" />
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((j) => (
                    <Skeleton key={j} className="h-16 w-12 flex-shrink-0" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
