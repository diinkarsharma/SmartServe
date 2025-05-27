
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { suggestDishQuantities, type SuggestDishQuantitiesInput, type SuggestDishQuantitiesOutput } from "@/ai/flows/suggest-dish-quantities-flow";
import type { CheckInFormValues } from '@/lib/schemas'; // For type

const CHECKINS_STORAGE_KEY = "smartserve_checkins_log"; // Ensure this is the same key used by check-in form

interface StoredCheckInEntry extends CheckInFormValues {
  id: string;
  date: string;
  status: string;
}

interface CurrentCounts {
  totalCheckIns: number;
  vegCount: number;
  nonVegCount: number;
  veganCount: number;
}

interface Suggestion {
  dishName: string;
  quantity: string;
  note: string;
}

export function DishPreparationSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCounts, setCurrentCounts] = useState<CurrentCounts>({
    totalCheckIns: 0,
    vegCount: 0,
    nonVegCount: 0,
    veganCount: 0,
  });
  const [isClient, setIsClient] = useState(false);

  const loadCurrentCountsFromStorage = () => {
    if (typeof window !== 'undefined') {
      const storedCheckIns = localStorage.getItem(CHECKINS_STORAGE_KEY);
      let newTotalCheckIns = 0;
      let newVegCount = 0;
      let newNonVegCount = 0;
      let newVeganCount = 0;

      if (storedCheckIns) {
        try {
          const parsedCheckIns = JSON.parse(storedCheckIns) as StoredCheckInEntry[];
          newTotalCheckIns = parsedCheckIns.length;
          parsedCheckIns.forEach(entry => {
            if (entry.dietPreference === 'veg') newVegCount++;
            else if (entry.dietPreference === 'non-veg') newNonVegCount++;
            else if (entry.dietPreference === 'vegan') newVeganCount++;
          });
        } catch (error) {
          console.error("Error parsing check-ins from localStorage for suggestions:", error);
        }
      }
      setCurrentCounts({
        totalCheckIns: newTotalCheckIns,
        vegCount: newVegCount,
        nonVegCount: newNonVegCount,
        veganCount: newVeganCount,
      });
      return { // Return the counts for immediate use in fetchSuggestions
        totalCheckIns: newTotalCheckIns,
        vegCount: newVegCount,
        nonVegCount: newNonVegCount,
        veganCount: newVeganCount,
      };
    }
    return currentCounts; // Should not happen if isClient is true
  };

  const fetchSuggestions = async (counts: CurrentCounts) => {
    setIsLoading(true);
    setError(null);

    // Only proceed if there are check-ins, otherwise, it doesn't make sense to ask for suggestions
    if (counts.totalCheckIns === 0 && isClient) { // Added isClient check to prevent premature return on SSR if applicable
        setSuggestions([]);
        setError("No check-ins yet. Suggestions will appear once users check in.");
        setIsLoading(false);
        return;
    }
    
    try {
      const input: SuggestDishQuantitiesInput = {
        totalCheckIns: counts.totalCheckIns,
        vegCount: counts.vegCount,
        nonVegCount: counts.nonVegCount,
        veganCount: counts.veganCount,
        historicalWastePercentage: 0.08, 
        specialEventMultiplier: 1.0,     
        dayOfWeekFactor: "Mid-week: standard demand, consider overall counts."
      };
      const response = await suggestDishQuantities(input);
      if (response && response.suggestions) {
        setSuggestions(response.suggestions);
      } else {
        setSuggestions([]); 
        setError("Received no suggestions from the AI. The model might be adjusting or input counts are very low.");
      }
    } catch (err) {
      console.error("Error fetching dish suggestions:", err);
      setError("Failed to load suggestions. Please ensure Genkit is running and check console for errors.");
      setSuggestions([]); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    const initialCounts = loadCurrentCountsFromStorage();
    if (initialCounts.totalCheckIns > 0) { // Fetch suggestions only if there are initial counts
        fetchSuggestions(initialCounts);
    } else {
        setIsLoading(false);
        setError("No check-ins yet. Suggestions will appear once users check in.");
    }


    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CHECKINS_STORAGE_KEY) {
        const updatedCounts = loadCurrentCountsFromStorage();
        fetchSuggestions(updatedCounts);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Empty dependency array means this runs once on mount and sets up listener

  if (!isClient) {
    // Render a placeholder or null during SSR/before client-side hydration
    return (
        <Card className="shadow-lg rounded-xl">
             <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Lightbulb className="mr-2 h-6 w-6 text-yellow-500" />
                        AI Dish Preparation Suggestions
                    </div>
                </CardTitle>
                <CardDescription>Loading current check-in data...</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3">Initializing...</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Lightbulb className="mr-2 h-6 w-6 text-yellow-500" />
            AI Dish Preparation Suggestions
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchSuggestions(currentCounts)} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
            AI-powered suggestions based on {currentCounts.totalCheckIns} current check-ins (Veg: {currentCounts.vegCount}, Non-Veg: {currentCounts.nonVegCount}, Vegan: {currentCounts.veganCount}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3">Loading intelligent suggestions...</p>
          </div>
        )}
        {!isLoading && error && (
          <div className="text-destructive p-4 bg-destructive/10 rounded-md border border-destructive/30">
            <p className="font-medium">Suggestion Status</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        {!isLoading && !error && suggestions.length === 0 && (
          <p className="text-muted-foreground p-4 text-center">No suggestions generated. This may be due to very low check-in counts or specific preferences. Try refreshing if counts increase.</p>
        )}
        {!isLoading && !error && suggestions.length > 0 &&
          suggestions.map((suggestion, index) => (
            <div key={index} className="p-4 bg-muted/60 rounded-lg border border-border shadow-sm">
              <h4 className="font-semibold text-foreground text-base">{suggestion.dishName} - <span className="text-primary font-bold">{suggestion.quantity}</span></h4>
              <p className="text-sm text-muted-foreground mt-1">{suggestion.note}</p>
            </div>
          ))
        }
      </CardContent>
    </Card>
  );
}
