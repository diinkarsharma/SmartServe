"use client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

export function AdminCalendar() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setDate(new Date());
  }, []);


  if (!isClient) {
    return (
        <Card className="shadow-md rounded-lg group-data-[state=collapsed]:hidden">
            <CardHeader className="p-3 pb-1">
                 <CardTitle className="text-sm font-medium">Calendar</CardTitle>
            </CardHeader>
            <CardContent className="p-1 flex justify-center items-center min-h-[280px]">
                <p className="text-xs text-muted-foreground">Loading calendar...</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-lg group-data-[state=collapsed]:hidden">
        <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm font-medium">Calendar</CardTitle>
        </CardHeader>
      <CardContent className="p-1">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md"
          classNames={{
            day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
            day_today: "bg-accent text-accent-foreground",
          }}
          // Example for holidays/events - this would typically come from data
          modifiers={{
            holidays: [new Date(2024, 7, 15), new Date(2024, 9, 2)], // Example: Aug 15, Oct 2
            teamEvents: [new Date(2024, 7, 20)] // Example: Aug 20
          }}
          modifiersStyles={{
            holidays: { border: "2px solid hsl(var(--destructive))", borderRadius: 'var(--radius)' },
            teamEvents: { border: "2px solid hsl(var(--accent))", borderRadius: 'var(--radius)' }
          }}
        />
         <div className="p-2 text-xs space-y-1 mt-1">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border-2 border-destructive"></div>
                <span>Holidays</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border-2 border-accent"></div>
                <span>Team Events</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
