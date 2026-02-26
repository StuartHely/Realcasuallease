import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";
import { Link } from "wouter";

interface NearbyCentresProps {
  centreId: number;
  centreName: string;
  radiusKm?: number;
}

export function NearbyCentres({ centreId, centreName, radiusKm = 10 }: NearbyCentresProps) {
  const [showNearby, setShowNearby] = useState(false);
  
  const { data: nearbyCentres, isLoading } = trpc.centres.getNearby.useQuery(
    { centreId, radiusKm },
    { enabled: showNearby }
  );

  if (!showNearby) {
    return (
      <div className="flex justify-center">
        <Button
          onClick={() => setShowNearby(true)}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <Navigation className="h-4 w-4" />
          Show Nearby Centres (within {radiusKm}km)
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nearby Centres</CardTitle>
          <CardDescription>Loading nearby shopping centres...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!nearbyCentres || nearbyCentres.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nearby Centres</CardTitle>
          <CardDescription>
            No other shopping centres found within {radiusKm}km of {centreName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowNearby(false)}
            variant="outline"
            size="sm"
          >
            Hide
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nearby Centres</CardTitle>
            <CardDescription>
              {nearbyCentres.length} shopping centre{nearbyCentres.length !== 1 ? 's' : ''} within {radiusKm}km of {centreName}
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowNearby(false)}
            variant="outline"
            size="sm"
          >
            Hide
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {nearbyCentres.map((centre) => (
            <Link key={centre.id} href={`/centre/${centre.slug || centre.id}`}>
              <div className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent hover:border-accent-foreground transition-colors cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <h3 className="font-semibold text-sm">{centre.name}</h3>
                  </div>
                  {centre.address && (
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      {centre.address}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {centre.distance}km
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
