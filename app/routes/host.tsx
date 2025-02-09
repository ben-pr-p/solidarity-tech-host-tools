import type { Route } from "./+types/host";
import { useQuery, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { withPrefetch } from "@/lib/orpcCaller.server";
import { orpcFetchQuery } from "@/lib/orpcFetch";
import { decrypt } from "@/lib/encrypt.server";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, MessageSquare, CheckCircle2, Users } from "lucide-react";
import type { EventRSVP } from "@/lib/solidarity.server";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import invariant from "tiny-invariant";
import { config } from "@/config.server";

export function meta({ data }: Route.MetaArgs) {
  const sessionStartTimeDate = new Date(data.session?.start_time ?? "");
  const sessionStartTime = sessionStartTimeDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return [
    {
      title: `${data.meta.titleHostPrefix} ${data.event.title} at ${sessionStartTime}`,
    },
    { name: "description", content: data.meta.description },
    { name: "image", content: data.meta.image },
    { name: "icon", content: data.meta.icon },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const eventKey = url.searchParams.get("eventKey");
  invariant(eventKey, "eventKey is required");
  const { eventId, sessionId } = decrypt(eventKey);

  return await withPrefetch(async (queryClient, orpc) => {
    const { event, session } = await queryClient.fetchQuery(
      orpc.getEventWithSessionById.queryOptions({
        input: {
          eventKey,
        },
      })
    );

    // Experiment with prefetching this or not

    await queryClient.prefetchQuery(
      orpc.getSessionRsvpsByEventIdAndSessionId.queryOptions({
        input: {
          eventKey,
        },
      })
    );

    return {
      eventId,
      sessionId,
      event,
      session,
      eventKey,
      meta: {
        titleHostPrefix: config.META_TITLE_HOST_PREFIX,
        description: config.META_DESCRIPTION,
        image: config.META_SHARE_IMAGE_URL,
        icon: config.FAVICON_URL,
      },
    };
  });
}

// Go from 12145551212 to +1 (214) 555-1212
const prettyPhoneNumber = (phone: string) => {
  return phone.replace(/^1?(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
};

interface RSVPCardProps {
  rsvp: EventRSVP & { attended: boolean };
  eventKey: string;
}

function humanizeTimestamp(timestamp: number): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const now = Date.now();
  const diffInSeconds = Math.floor((timestamp - now) / 1000);

  const intervals: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "week", seconds: 604800 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 },
  ];

  for (const interval of intervals) {
    if (Math.abs(diffInSeconds) >= interval.seconds) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      return rtf.format(count, interval.unit);
    }
  }
  return "just now";
}

function RSVPCard({ rsvp, eventKey }: RSVPCardProps) {
  const [clientAttended, setClientAttended] = useState<boolean | undefined>(
    undefined
  );

  const { mutate } = useMutation(
    orpcFetchQuery.markAttended.mutationOptions({})
  );

  const { mutate: mutateDeleteAttendance } = useMutation(
    orpcFetchQuery.deleteAttendance.mutationOptions({})
  );

  const markAttended = () => {
    setClientAttended(true);
    mutate({
      eventKey,
      userId: rsvp.user_id,
    });
  };

  const deleteAttendance = () => {
    setClientAttended(false);
    mutateDeleteAttendance({
      eventKey,
      userId: rsvp.user_id,
    });
  };

  const optimisticAttended = clientAttended ?? rsvp.attended;

  const rsvpTime = new Date(rsvp.created_at);
  const rsvpTimeHumanized = humanizeTimestamp(rsvpTime.getTime());

  return (
    <Card key={rsvp.id} className={optimisticAttended ? "bg-green-50" : ""}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">
            {rsvp.user_details.first_name} {rsvp.user_details.last_name}
          </h3>
          <p className="text-sm text-gray-500">
            {prettyPhoneNumber(rsvp.user_details.phone)}
          </p>
          <div className="mt-1">
            <Chip color={rsvp.is_confirmed ? "green" : "yellow"}>
              {rsvp.is_confirmed ? "Confirmed" : "Unconfirmed"}
            </Chip>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <a
              href={`tel:${rsvp.user_details.phone}`}
              className="text-blue-500"
            >
              <Phone size={20} />
            </a>

            <a
              href={`sms:${rsvp.user_details.phone}`}
              className="text-green-500"
            >
              <MessageSquare size={20} />
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <span className="font-semibold">RSVP'ed</span>{" "}
            <span className="">{rsvpTimeHumanized}</span>
          </p>
          {rsvp.is_confirmed && (
            <p className="text-xs text-gray-500 mt-2">
              <span className="font-semibold">Confirmed</span>{" "}
              {humanizeTimestamp(new Date(rsvp.updated_at).getTime())}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`attendance-${rsvp.id}`}
            checked={optimisticAttended}
            onCheckedChange={() =>
              optimisticAttended ? deleteAttendance() : markAttended()
            }
            className="w-6 h-6 border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <label
            htmlFor={`attendance-${rsvp.id}`}
            className="text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Attended
          </label>
          {optimisticAttended && (
            <CheckCircle2 className="text-green-500" size={24} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function HostTools({ loaderData }: Route.ComponentProps) {
  const { eventKey } = loaderData;

  const { data } = useSuspenseQuery(
    orpcFetchQuery.getEventWithSessionById.queryOptions({
      input: {
        eventKey,
      },
    })
  );

  const {
    data: rsvps,
    isLoading: rsvpsLoading,
    isError: rsvpsError,
  } = useSuspenseQuery(
    orpcFetchQuery.getSessionRsvpsByEventIdAndSessionId.queryOptions({
      input: {
        eventKey,
      },
    })
  );

  const { event, session } = data;

  const [searchTerm, setSearchTerm] = useState("");

  const filteredRSVPs =
    rsvps?.filter((rsvp) =>
      `${rsvp.user_details.first_name} ${rsvp.user_details.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    ) || [];

  if (!event || !session) {
    return <div>Loading...</div>;
  }

  const { confirmedCount, totalCount } = useMemo(() => {
    const confirmed = rsvps.filter((rsvp) => rsvp.is_confirmed).length;
    return { confirmedCount: confirmed, totalCount: rsvps.length };
  }, [rsvps]);

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center flex-col space-y-2">
            <span>{event.title}</span>
            <div className="flex items-center space-x-2 text-sm font-normal">
              <Users size={20} />
              <span>{confirmedCount} confirmed</span>
              <span>/</span>
              <span>{totalCount} total</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <span className="font-semibold text-gray-600">Location:</span>{" "}
            {session.location_name || "TBA"}
          </p>
          <p>
            <span className="font-semibold text-gray-600">Date:</span>{" "}
            {formatDate(session.start_time)}
          </p>
          <p>
            <span className="font-semibold text-gray-600">Time:</span>{" "}
            {formatDate(session.start_time, "time")} -{" "}
            {formatDate(session.end_time, "time")}
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Button onClick={() => copyPhoneNumbers(rsvps)}>
              Copy All Host Phone Numbers
            </Button>
            <Button
              onClick={() =>
                copyPhoneNumbers(rsvps.filter((rsvp) => rsvp.is_confirmed))
              }
            >
              Copy Confirmed Host Phone Numbers
            </Button>
          </div>
        </CardContent>
      </Card>

      <Input
        className="mb-4"
        placeholder="Search RSVPs by name"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="space-y-4">
        {filteredRSVPs
          .sort((a, b) => a.user_id - b.user_id)
          .map((rsvp) => (
            <RSVPCard key={rsvp.id} rsvp={rsvp} eventKey={eventKey} />
          ))}
      </div>
    </>
  );
}

function formatDate(
  dateString: string,
  format: "date" | "time" = "date"
): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (format === "date") {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } else {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

function copyPhoneNumbers(rsvps: EventRSVP[]): void {
  const phoneNumbers = rsvps
    .map((rsvp) => rsvp.user_details?.phone || "")
    .filter(Boolean)
    .join("\n");

  if (phoneNumbers) {
    navigator.clipboard
      .writeText(phoneNumbers)
      .then(() => {
        alert("Phone numbers copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy phone numbers: ", err);
      });
  } else {
    alert("No phone numbers to copy.");
  }
}

interface ChipProps {
  children: React.ReactNode;
  variant?: "default" | "outline";
  color?: "default" | "green" | "yellow" | "red";
  className?: string;
}

function Chip({
  children,
  variant = "default",
  color = "default",
  className,
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-gray-100 text-gray-800",
        variant === "outline" && "border border-gray-200",
        color === "green" && "bg-green-100 text-green-800",
        color === "yellow" && "bg-yellow-100 text-yellow-800",
        color === "red" && "bg-red-100 text-red-800",
        className
      )}
    >
      {children}
    </span>
  );
}
