import type { Route } from "./+types/host";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { withPrefetch } from "@/lib/orpcCaller.server";
import { orpcFetchQuery } from "@/lib/orpcFetch";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Phone,
  MessageSquare,
  CheckCircle2,
  Users,
  UserPlus,
} from "lucide-react";
import type { EventRSVP } from "@/lib/solidarity.server";
import { cn } from "@/lib/utils";
import invariant from "tiny-invariant";
import { getEncryptor } from "@/lib/encrypt.server";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
      title: `${config.META_TITLE_HOST_PREFIX} ${data.session.title} at ${sessionStartTime}`,
    },
    { name: "description", content: config.META_DESCRIPTION },
    { name: "image", content: config.META_SHARE_IMAGE_URL },
    { name: "icon", content: config.FAVICON_URL },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const eventKey = url.searchParams.get("eventKey");
  invariant(eventKey, "eventKey is required");
  const encryptor = getEncryptor(config.SYMMETRIC_ENCRYPTION_KEY);
  const { eventId, sessionId } = await encryptor.decrypt(eventKey);

  return await withPrefetch(config, async (queryClient, orpc) => {
    const session = await queryClient.fetchQuery(
      orpc.getEventSessionById.queryOptions({
        input: {
          eventKey,
        },
      })
    );

    // Check if event is more than 2 days in the past
    const now = new Date();
    const sessionDate = new Date(session.start_time);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const isEventTooOld = sessionDate < twoDaysAgo;

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
      session,
      eventKey,
      isEventTooOld,
    };
  });
}

// Go from 12145551212 to +1 (214) 555-1212
const prettyPhoneNumber = (phone: string) => {
  if (!phone) return undefined;
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

  const confirmedNotAttending = rsvp.is_attending === "no";

  const bgClassName = (() => {
    if (confirmedNotAttending) return "bg-red-50";
    if (optimisticAttended) return "bg-green-50";
    return "";
  })();

  return (
    <Card key={rsvp.id} className={bgClassName}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">
            {rsvp.user_details.first_name} {rsvp.user_details.last_name}
          </h3>
          <p className="text-sm text-gray-500">
            {prettyPhoneNumber(rsvp.user_details.phone)}
          </p>
          <div className="mt-1">
            <Chip
              color={
                rsvp.is_confirmed === true
                  ? "green"
                  : rsvp.is_confirmed === false
                  ? "red"
                  : "yellow"
              }
            >
              {rsvp.is_confirmed === true
                ? "Confirmed"
                : rsvp.is_confirmed === false
                ? "Not Attending"
                : "Unconfirmed"}
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
          {confirmedNotAttending && (
            <p className="text-xs text-gray-500 mt-2">
              <span className="font-semibold">Said Not Attending Anymore</span>{" "}
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
  const { eventKey, isEventTooOld } = loaderData;
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery(
    orpcFetchQuery.getEventSessionById.queryOptions({
      input: {
        eventKey,
      },
    })
  );

  const {
    data: rsvps,
    isLoading: _rsvpsLoading,
    isError: _rsvpsError,
  } = useSuspenseQuery(
    orpcFetchQuery.getSessionRsvpsByEventIdAndSessionId.queryOptions({
      input: {
        eventKey,
      },
    })
  );

  // Show notice if event is more than 2 days old
  if (isEventTooOld) {
    return (
      <Card className="mb-6 border-2 border-red-500">
        <CardContent className="p-8">
          <p className="text-center text-xl font-semibold text-red-600">
            This is a past event link
          </p>
          <p className="text-center text-lg mt-4 text-gray-700">
            You have opened a Zohran host link for an event that has already
            occurred. If you need to access this data or believe this is an
            error, please contact the campaign.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { mutate: mutateAddAttendee, isPending: isAddingAttendee } =
    useMutation({
      ...orpcFetchQuery.rsvpNewPerson.mutationOptions({}),
      onSuccess: () => {
        setIsAddAttendeeOpen(false);
        queryClient.invalidateQueries({
          ...orpcFetchQuery.getSessionRsvpsByEventIdAndSessionId.queryOptions({
            input: {
              eventKey,
            },
          }),
        });
      },
    });

  const handleAddAttendee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newAttendee = {
      first_name: formData.get("firstName") as string,
      last_name: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone_number: formData.get("phoneNumber") as string,
    };
    mutateAddAttendee({
      eventKey,
      person: newAttendee,
    });
  };

  const [isAddAttendeeOpen, setIsAddAttendeeOpen] = useState(false);

  const session = data;
  // const { event, session } = data;

  const [searchTerm, setSearchTerm] = useState("");

  const filteredRSVPs =
    rsvps?.filter((rsvp) =>
      `${rsvp.user_details.first_name} ${rsvp.user_details.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    ) || [];

  if (!session) {
    return <div>Loading...</div>;
  }

  const { confirmedCount, totalCount } = useMemo(() => {
    const confirmed = rsvps.filter((rsvp) => rsvp.is_confirmed).length;
    return { confirmedCount: confirmed, totalCount: rsvps.length };
  }, [rsvps]);

  const countBailed = filteredRSVPs.filter(
    (rsvp) => rsvp.is_attending === "no"
  ).length;

  const filteredRSVPsWithNotAttendingList = filteredRSVPs.sort((a, b) => {
    if (a.is_confirmed === false || b.is_confirmed === false) {
      if (a.is_confirmed !== false && b.is_confirmed === false) return -1;
      if (a.is_confirmed === false && b.is_confirmed !== false) return 1;
    }
    if (a.is_attending === "no" && b.is_attending !== "no") return 1;
    if (a.is_attending !== "no" && b.is_attending === "no") return -1;
    return a.user_id - b.user_id;
  });

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center flex-col space-y-2">
            <span>{session.title}</span>
            <div className="flex items-center space-x-2 text-sm font-normal">
              <Users size={20} />
              <span>{confirmedCount} confirmed</span>
              <span>/</span>
              <span>{countBailed} bailed</span>
              <span>/</span>
              <span>{totalCount} total</span>
            </div>

            <Dialog
              open={isAddAttendeeOpen}
              onOpenChange={setIsAddAttendeeOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Unregistered Attendee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Unregistered Attendee</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddAttendee} className="space-y-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input id="phoneNumber" name="phoneNumber" required />
                  </div>

                  <Button type="submit" disabled={isAddingAttendee}>
                    {isAddingAttendee ? "Adding..." : "Add Attendee"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
            <Button
              onClick={() =>
                copyPhoneNumbers(
                  rsvps.filter(
                    (rsvp) =>
                      rsvp.is_confirmed !== false && rsvp.is_attending !== "no"
                  )
                )
              }
            >
              Copy Confirmed and Unconfirmed Host Phone Numbers
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
        {filteredRSVPsWithNotAttendingList.map((rsvp) => (
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
      timeZone: "America/New_York",
    });
  } else {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
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
