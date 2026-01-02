import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Calendar, CheckCircle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, setLocation] = useLocation();
  const [centreName, setCentreName] = useState("");
  const [date, setDate] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search for autocomplete
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(centreName);
    }, 300);
    return () => clearTimeout(timer);
  }, [centreName]);

  // Fetch suggestions
  const { data: suggestions = [] } = trpc.centres.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  // Show suggestions when typing
  useEffect(() => {
    if (centreName.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [centreName, suggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (centreName && date) {
      const searchParams = new URLSearchParams({
        query: centreName, // Changed from 'centre' to 'query' for smart search
        date: date,
      });
      setLocation(`/search?${searchParams.toString()}`);
    }
  };

  const selectSuggestion = (name: string) => {
    setCentreName(name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex].name);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-blue-900">Casual Lease</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/")}>Home</Button>
            <Button variant="ghost" onClick={() => setLocation("/my-bookings")}>My Bookings</Button>
            <Button variant="ghost" onClick={() => setLocation("/profile")}>Profile</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-5xl font-bold text-blue-900 mb-6">
              Find Your Perfect Pop-Up Space
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Book short-term retail spaces in Australian shopping centres instantly
            </p>

            {/* Search Box */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Search Available Spaces</CardTitle>
                <CardDescription>
                  Enter a shopping centre name or suburb and select a date
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="e.g., Highlands Marketplace 3x4m or Campbelltown 5 tables"
                      value={centreName}
                      onChange={(e) => setCentreName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => {
                        if (centreName.length >= 2 && suggestions.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      className="h-12 text-lg"
                      autoComplete="off"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {suggestions.map((centre, index) => (
                          <div
                            key={centre.id}
                            onClick={() => selectSuggestion(centre.name)}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              index === selectedIndex
                                ? "bg-blue-50 text-blue-900"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="font-medium">{centre.name}</div>
                            {(centre.suburb || centre.city) && (
                              <div className="text-sm text-gray-500">
                                {[centre.suburb, centre.city]
                                  .filter(Boolean)
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    size="lg"
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
                    disabled={!centreName || !date}
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* State Filter Buttons */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">
                Or browse by state:
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { code: "NSW", name: "New South Wales" },
                  { code: "VIC", name: "Victoria" },
                  { code: "QLD", name: "Queensland" },
                  { code: "SA", name: "South Australia" },
                  { code: "WA", name: "Western Australia" },
                  { code: "TAS", name: "Tasmania" },
                ].map((state) => (
                  <Button
                    key={state.code}
                    onClick={() => setLocation(`/centres?state=${state.code}`)}
                    variant="outline"
                    className="bg-white/90 hover:bg-white border-2 border-blue-200 hover:border-blue-400 text-blue-900 font-semibold px-6 py-3 h-auto"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {state.code}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <h3 className="text-3xl font-bold text-center text-blue-900 mb-12">
              How It Works
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>1. Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Find available spaces by shopping centre name or location and date
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>2. Book</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Select your preferred space, dates, and complete the booking instantly
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>3. Activate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Get instant confirmation and start your pop-up retail experience
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <h3 className="text-3xl font-bold text-center text-blue-900 mb-12">
              Why Choose Casual Lease?
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Instant Booking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Book your space instantly with real-time availability and instant confirmation
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Flexible Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Short-term leases from a single day to multiple weeks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Prime Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Access high-traffic shopping centres across Australia
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Secure Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Safe and secure payment processing through Stripe
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-8 px-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 Casual Lease. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
