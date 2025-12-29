import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building2, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Centres() {
  const [, setLocation] = useLocation();
  const [selectedState, setSelectedState] = useState<string>("");

  // Get state from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get("state");
    if (stateParam) {
      setSelectedState(stateParam);
    }
  }, []);

  // Fetch centres filtered by state
  const { data: centres = [], isLoading } = trpc.centres.getByState.useQuery(
    { state: selectedState },
    { enabled: !!selectedState }
  );

  const states = [
    { code: "NSW", name: "New South Wales" },
    { code: "VIC", name: "Victoria" },
    { code: "QLD", name: "Queensland" },
    { code: "SA", name: "South Australia" },
    { code: "WA", name: "Western Australia" },
    { code: "TAS", name: "Tasmania" },
  ];

  const handleStateChange = (stateCode: string) => {
    setSelectedState(stateCode);
    setLocation(`/centres?state=${stateCode}`);
  };

  const selectedStateName = states.find((s) => s.code === selectedState)?.name || selectedState;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-900">Casual Lease</h1>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* State Filter Buttons */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Browse Shopping Centres by State</CardTitle>
            <CardDescription>Select a state to view available shopping centres</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {states.map((state) => (
                <Button
                  key={state.code}
                  onClick={() => handleStateChange(state.code)}
                  variant={selectedState === state.code ? "default" : "outline"}
                  className={
                    selectedState === state.code
                      ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 h-auto"
                      : "border-2 border-blue-200 hover:border-blue-400 text-blue-900 font-semibold px-6 py-3 h-auto"
                  }
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  {state.code}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {selectedState && (
          <div>
            <h2 className="text-3xl font-bold text-blue-900 mb-6">
              Shopping Centres in {selectedStateName}
            </h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading centres...</p>
              </div>
            ) : centres.length === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="py-12 text-center">
                  <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No centres found in {selectedStateName}
                  </h3>
                  <p className="text-gray-500">
                    We don't have any shopping centres listed in this state yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {centres.map((centre: any) => (
                  <Card
                    key={centre.id}
                    className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => setLocation(`/centre/${centre.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl text-blue-900">{centre.name}</CardTitle>
                      <CardDescription className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          {centre.address && <div>{centre.address}</div>}
                          <div>
                            {[centre.suburb, centre.city, centre.state, centre.postcode]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/centre/${centre.id}`);
                        }}
                      >
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedState && (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <MapPin className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Select a state to get started
              </h3>
              <p className="text-gray-500">
                Choose a state from the buttons above to view shopping centres in that area.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
