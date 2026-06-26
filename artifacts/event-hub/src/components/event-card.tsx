import { Link } from "wouter";
import { Calendar, MapPin, Users, Activity } from "lucide-react";
import { Event, EventCategory } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { format } from "date-fns";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const getCategoryColor = (category: EventCategory) => {
    switch (category) {
      case EventCategory.cycling: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-200";
      case EventCategory.hiking: return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100 border-emerald-200";
      case EventCategory['summer-night']: return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100 border-indigo-200";
      case EventCategory.walking: return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 border-amber-200";
      default: return "";
    }
  };

  const getDifficultyBadge = (difficulty?: string | null) => {
    if (!difficulty) return null;
    let color = "bg-gray-100 text-gray-800";
    if (difficulty === "easy") color = "bg-green-100 text-green-800";
    if (difficulty === "moderate") color = "bg-yellow-100 text-yellow-800";
    if (difficulty === "challenging") color = "bg-red-100 text-red-800";
    
    return (
      <Badge variant="outline" className={`${color} border-transparent font-medium capitalize`}>
        {difficulty}
      </Badge>
    );
  };

  const isFull = event.registrationCount >= event.capacity;

  return (
    <Card className="flex flex-col h-full overflow-hidden hover-elevate transition-all duration-200 border-border/50 group">
      <div className="relative h-48 w-full bg-muted overflow-hidden">
        {event.imageUrl ? (
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/10">
            <Activity className="w-12 h-12 text-secondary/40" />
          </div>
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge variant="secondary" className={`font-semibold capitalize border ${getCategoryColor(event.category)}`}>
            {event.category.replace("-", " ")}
          </Badge>
          {getDifficultyBadge(event.difficulty)}
        </div>
      </div>
      
      <CardHeader className="p-5 pb-3">
        <div className="flex justify-between items-start gap-4">
          <h3 className="font-display text-xl font-bold leading-tight line-clamp-2">
            {event.title}
          </h3>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 flex-1 flex flex-col gap-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-2 text-primary" />
          {format(new Date(event.date), "EEE, MMM d, yyyy • h:mm a")}
        </div>
        <div className="flex items-center text-sm text-muted-foreground line-clamp-1">
          <MapPin className="w-4 h-4 mr-2 text-primary shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="w-4 h-4 mr-2 text-primary" />
          {event.registrationCount} / {event.capacity} spots filled
        </div>
        
        {event.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0 mt-auto">
        <Link href={`/events/${event.id}`} className="w-full">
          <Button variant={isFull ? "secondary" : "default"} className="w-full font-semibold">
            {isFull ? "Join Waitlist" : "View Details"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
