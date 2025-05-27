
"use client";

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { MealPreferenceCard, type TodaysChoice } from "@/components/dashboard/MealPreferenceCard";
import { NotificationsCard } from "@/components/dashboard/NotificationsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import type { CheckInFormValues, StoredCheckInEntry } from '@/lib/schemas';

const USER_DATA_KEY = "smartserve_user";
const CHECKINS_STORAGE_KEY = "smartserve_checkins_log";

type DietPreference = 'veg' | 'non-veg' | 'vegan';

const lunchTimingOptions = [
  { value: "12-1", label: "12:00 PM - 01:00 PM" },
  { value: "1-2", label: "01:00 PM - 02:00 PM" },
  { value: "2-3", label: "02:00 PM - 03:00 PM" },
  { value: "3-4", label: "03:00 PM - 04:00 PM" },
];

const getTimingLabel = (value: string | undefined) => {
  if (!value) return "Not set";
  return lunchTimingOptions.find(opt => opt.value === value)?.label || "Not set";
};

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>("User");
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [preferredTiming, setPreferredTiming] = useState<string | undefined>(undefined);
  const [defaultDietPreference, setDefaultDietPreference] = useState<DietPreference>('veg');
  const [todaysChoice, setTodaysChoice] = useState<TodaysChoice>('veg'); // For MealPreferenceCard initialization
  const [isClient, setIsClient] = useState(false);

  const loadUserData = useCallback(() => {
    const storedUserDataString = localStorage.getItem(USER_DATA_KEY);
    let currentEmail: string | undefined;
    let currentDefaultDiet: DietPreference = 'veg';

    if (storedUserDataString) {
      try {
        const storedUserData: CheckInFormValues = JSON.parse(storedUserDataString);
        setUserName(storedUserData.name || "User");
        currentEmail = storedUserData.email;
        setUserEmail(currentEmail);
        setPreferredTiming(storedUserData.preferredLunchTiming);
        currentDefaultDiet = storedUserData.dietPreference || 'veg';
        setDefaultDietPreference(currentDefaultDiet);
      } catch (error) {
        console.error("Failed to parse user data from localStorage", error);
        localStorage.removeItem(USER_DATA_KEY); 
      }
    }

    // Load today's choice from the check-in log
    if (currentEmail) {
      const storedCheckInsString = localStorage.getItem(CHECKINS_STORAGE_KEY);
      if (storedCheckInsString) {
        try {
          const storedCheckIns: StoredCheckInEntry[] = JSON.parse(storedCheckInsString);
          const userLatestCheckIn = storedCheckIns.find(entry => entry.email === currentEmail); // Assumes latest is first, or needs sorting by date
          if (userLatestCheckIn) {
            if (userLatestCheckIn.skipMealToday) {
              setTodaysChoice('skip');
            } else {
              setTodaysChoice(userLatestCheckIn.todaysActualDiet || userLatestCheckIn.dietPreference || currentDefaultDiet);
            }
          } else {
             setTodaysChoice(currentDefaultDiet); // Fallback if no check-in found
          }
        } catch (e) { console.error("Error parsing check-ins for today's choice", e); setTodaysChoice(currentDefaultDiet); }
      } else {
         setTodaysChoice(currentDefaultDiet); // Fallback if no check-in log
      }
    } else {
        setTodaysChoice(currentDefaultDiet); // Fallback if no email
    }
  }, []);


  useEffect(() => {
    setIsClient(true);
    loadUserData();
  }, [loadUserData]);

  const updateCheckInLog = useCallback((fieldsToUpdate: Partial<Pick<StoredCheckInEntry, 'preferredLunchTiming' | 'dietPreference' | 'todaysActualDiet' | 'skipMealToday'>>) => {
    if (!userEmail || typeof window === 'undefined') return;

    const storedCheckInsString = localStorage.getItem(CHECKINS_STORAGE_KEY);
    if (storedCheckInsString) {
      try {
        let storedCheckIns: StoredCheckInEntry[] = JSON.parse(storedCheckInsString);
        let updated = false;
        // Find the latest entry for this user by email and update it
        const userEntryIndex = storedCheckIns.findIndex(entry => entry.email === userEmail);
        
        if (userEntryIndex !== -1) {
            storedCheckIns[userEntryIndex] = { 
                ...storedCheckIns[userEntryIndex], 
                ...fieldsToUpdate 
            };
            updated = true;
        }

        if (updated) {
          localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(storedCheckIns));
          window.dispatchEvent(new StorageEvent('storage', { key: CHECKINS_STORAGE_KEY }));
          console.log("Updated check-in log for", userEmail, "with", fieldsToUpdate);
        } else {
          console.warn("Could not find user's check-in entry to update.");
        }
      } catch (error) {
        console.error("Error updating check-in log:", error);
      }
    }
  }, [userEmail]);

  const handleTimingChange = (newTimingValue: string) => {
    const newTiming = newTimingValue as CheckInFormValues['preferredLunchTiming'];
    setPreferredTiming(newTiming);
    const storedUserDataString = localStorage.getItem(USER_DATA_KEY);
    let updatedUserData: Partial<CheckInFormValues> = {};
    if (storedUserDataString) {
      try {
        updatedUserData = JSON.parse(storedUserDataString);
      } catch (error) {
        console.error("Failed to parse user data before update", error);
        updatedUserData = { name: userName, email: userEmail, dietPreference: defaultDietPreference }; 
      }
    } else {
        updatedUserData = { name: userName, email: userEmail, dietPreference: defaultDietPreference };
    }
    localStorage.setItem(USER_DATA_KEY, JSON.stringify({ ...updatedUserData, preferredLunchTiming: newTiming }));
    updateCheckInLog({ preferredLunchTiming: newTiming });
  };

  const handleDefaultDietChange = (newDiet: DietPreference) => {
    setDefaultDietPreference(newDiet);
    const storedUserDataString = localStorage.getItem(USER_DATA_KEY);
    let updatedUserData: Partial<CheckInFormValues> = {};
     if (storedUserDataString) {
      try {
        updatedUserData = JSON.parse(storedUserDataString);
      } catch (error) {
         console.error("Failed to parse user data before diet update", error);
        updatedUserData = { name: userName, email: userEmail, preferredLunchTiming: preferredTiming };
      }
    } else {
        updatedUserData = { name: userName, email: userEmail, preferredLunchTiming: preferredTiming };
    }
    localStorage.setItem(USER_DATA_KEY, JSON.stringify({ ...updatedUserData, dietPreference: newDiet }));
    
    // Also update the check-in log's default preference.
    // And if they are not skipping today, update today's actual diet to this new default.
    const latestCheckInString = localStorage.getItem(CHECKINS_STORAGE_KEY);
    let isSkipping = false;
    if(latestCheckInString && userEmail){
        try {
            const latestCheckIns: StoredCheckInEntry[] = JSON.parse(latestCheckInString);
            const userEntry = latestCheckIns.find(e => e.email === userEmail);
            if(userEntry) isSkipping = userEntry.skipMealToday || false;
        } catch(e){}
    }

    updateCheckInLog({ 
        dietPreference: newDiet, 
        ...( !isSkipping && { todaysActualDiet: newDiet } ) // only update actual if not skipping
    });
  };

  const handleTodaysChoiceChange = (choice: TodaysChoice) => {
    setTodaysChoice(choice); // Update local UI state
    if (choice === "skip") {
      updateCheckInLog({ skipMealToday: true });
    } else {
      updateCheckInLog({ skipMealToday: false, todaysActualDiet: choice });
    }
  };
  
  if (!isClient) {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Loading SmartServe Dashboard...
            </h1>
         </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
        Today's SmartServe Dashboard, {userName}
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MealPreferenceCard 
            initialDefaultPreference={defaultDietPreference}
            onDefaultPreferenceChange={handleDefaultDietChange}
            initialTodaysChoice={todaysChoice}
            onTodaysChoiceChange={handleTodaysChoiceChange}
          />
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary" />
                Preferred Lunch Timings
              </CardTitle>
              <CardDescription>Your registered preferred time for lunch. You can change it here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg font-semibold text-foreground">
                Current: {getTimingLabel(preferredTiming)}
              </p>
              <div>
                <Select onValueChange={handleTimingChange} value={preferredTiming}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Change preferred lunch slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {lunchTimingOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This is your general preference. Actual service times may vary.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Last 3 Meals Feedback</CardTitle>
              <CardDescription>Review feedback from your recent meals.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Feedback for previous meals will be displayed here. (Placeholder)
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <NotificationsCard />
        </div>
      </div>
    </div>
  );
}
