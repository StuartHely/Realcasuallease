import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Calendar, CheckCircle, MapPin, Info } from "lucide-react";
import AustraliaMap from "@/components/AustraliaMap";
import FAQ from "@/components/FAQ";
import Logo from "@/components/Logo";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { parseSearchQuery } from "@shared/queryParser";

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search for autocomplete
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      // Extract centre name part for autocomplete (remove date, size, etc.)
      const parsed = parseSearchQuery(searchQuery);
      setDebouncedQuery(parsed.centreName);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch suggestions based on centre name
  const { data: suggestions = [] } = trpc.centres.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  // Fetch all centres for map
  const { data: allCentres = [] } = trpc.centres.list.useQuery();

  // Show suggestions when typing
  useEffect(() => {
    if (debouncedQuery.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedQuery, suggestions]);

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
    if (!searchQuery.trim()) return;
    
    // Parse the query to extract date
    const parsed = parseSearchQuery(searchQuery);
    
    // Build search params
    const searchParams = new URLSearchParams({
      query: searchQuery,
    });
    
    // If date was parsed from query, include it; otherwise use today
    if (parsed.parsedDate) {
      searchParams.set("date", parsed.parsedDate);
    } else {
      // Default to today if no date specified
      searchParams.set("date", format(new Date(), "yyyy-MM-dd"));
    }
    
    // Include end date if it's a range
    if (parsed.dateRangeEnd) {
      searchParams.set("endDate", parsed.dateRangeEnd);
    }
    
    setLocation(`/search?${searchParams.toString()}`);
  };

  const selectSuggestion = (name: string) => {
    // Replace the centre name part in the query while keeping other parts
    const parsed = parseSearchQuery(searchQuery);
    
    // Build the new query with the selected centre name
    let newQuery = name;
    
    // Add back size if it was in the original query
    if (parsed.minSizeM2) {
      // Try to find the original size pattern and append it
      const sizeMatch = searchQuery.match(/(\d+\.?\d*\s*m?\s*(?:[xX×]|by)\s*\d+\.?\d*\s*m?|\d+\.?\d*\s*(?:sqm|sq\s*m|square\s*meters?|m2|m\s*2))/i);
      if (sizeMatch) {
        newQuery += " " + sizeMatch[1];
      }
    }
    
    // Add back category if it was in the original query
    if (parsed.productCategory) {
      newQuery += " " + parsed.productCategory;
    }
    
    // Add back date if it was in the original query
    if (parsed.parsedDate) {
      // Try to find the original date pattern and append it
      const datePatterns = [
        /\b(?:from|on|for)?\s*\d{1,2}(?:st|nd|rd|th)?\s+(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s+\d{4})?\b/i,
        /\b(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?\b/i,
        /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,
        /\b(?:today|tomorrow)\b/i,
        /\b(?:next|this)?\s*(?:sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/i,
      ];
      
      for (const pattern of datePatterns) {
        const match = searchQuery.match(pattern);
        if (match) {
          newQuery += " " + match[0];
          break;
        }
      }
    }
    
    setSearchQuery(newQuery);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key to trigger search when suggestions are not shown
    if (e.key === "Enter" && (!showSuggestions || suggestions.length === 0)) {
      e.preventDefault();
      handleSearch();
      return;
    }
    
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

  // Parse current query to show detected date
  const parsedQuery = parseSearchQuery(searchQuery);
  const hasDetectedDate = !!parsedQuery.parsedDate;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setLocation("/")}
          >
            <Logo height={48} className="h-12" />
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
        <section className="py-12 md:py-20 px-4">
          <div className="container mx-auto max-w-5xl text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-900 mb-4 md:mb-6 leading-tight">
              The Easiest Way to Book Casual Leasing in Shopping Centres
            </h2>
            <p className="text-xl md:text-2xl text-blue-900 font-semibold mb-8 md:mb-12 max-w-3xl mx-auto animate-fade-in">
              Describe the space you need in any order. We'll handle the rest.
            </p>

            {/* Search Box */}
            <Card className="shadow-xl">
              <CardContent className="pt-6 md:pt-8 space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Eg. 15–20sqm fashion at Eastgate from next week."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                          if (debouncedQuery.length >= 2 && suggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                        className="h-14 text-xl pl-12 placeholder:text-gray-700 placeholder:text-xl"
                        autoComplete="off"
                      />
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                              {centre.suburb && (
                                <div className="text-sm text-gray-500">
                                  {centre.suburb}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="h-14 px-8 bg-blue-600 hover:bg-blue-700"
                      disabled={!searchQuery.trim()}
                    >
                      <Search className="mr-2 h-5 w-5" />
                      Search
                    </Button>
                  </div>
                  
                  {/* Show detected date feedback */}
                  {searchQuery.trim() && (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      {hasDetectedDate ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Date detected: {format(new Date(parsedQuery.parsedDate!), "EEEE, d MMMM yyyy")}
                          {parsedQuery.dateRangeEnd && (
                            <span> to {format(new Date(parsedQuery.dateRangeEnd), "d MMMM yyyy")}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          No date detected - will use today's date
                        </span>
                      )}
                    </div>
                  )}
                </form>
                
                {/* State Filter Buttons */}
                <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200">
                  <p className="text-base font-medium text-gray-800 mb-4 text-center">
                    Browse all available spaces
                  </p>
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
              </CardContent>
            </Card>

            {/* Australia Map with Centre Markers */}
            <div className="mt-12">
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">Explore Centres Across Australia</CardTitle>
                  <CardDescription>
                    Click on any marker to view centre details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AustraliaMap centres={allCentres} />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <p className="text-base text-center text-blue-800 mb-4 max-w-4xl mx-auto leading-relaxed">
              The most advanced Casual Leasing Platform ever created — Years of hands-on experience delivering unmatched control for landlords and managing agents — plus a seamless booking experience for users.
            </p>
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
                    Enter what you need in natural language - centre name, size, product type, and date all in one search.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>2. Compare</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    View availability calendars, compare sites, and find the perfect space for your pop-up.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>3. Book</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Book instantly online and receive confirmation. It's that simple.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQ />
      </main>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} Real Casual Leasing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
