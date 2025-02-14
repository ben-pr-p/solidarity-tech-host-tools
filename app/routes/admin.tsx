import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Event, EventSession } from "@/lib/solidarity.server";
import type { Route } from "./+types/admin";
import { withPrefetch } from "@/lib/orpcCaller.server";
import { useQuery } from "@tanstack/react-query";
import { orpcFetchQuery } from "@/lib/orpcFetch";

export async function loader({ request, context }: Route.LoaderArgs) {
  const searchParams = new URL(request.url).searchParams;
  const password = searchParams.get("pw");

  console.log("context.env.ADMIN_PASSWORD", context.env.ADMIN_PASSWORD);
  console.log("password", password);

  return await withPrefetch(context.env, async (queryClient, orpc) => {
    if (password !== context.env.ADMIN_PASSWORD) {
      return { unauthorized: true, providedPw: password };
    }
    await queryClient.prefetchQuery(
      orpc.listEventsWithSessionHostURLsInFuture.queryOptions({
        input: {
          pw: password,
        },
      })
    );
    return { unauthorized: false, providedPw: password };
  });
}

type EventWithFutureSessions = Event & {
  futureSessions: SessionWithSessionHostURL[];
};

function EventAccordion({ event }: { event: EventWithFutureSessions }) {
  return (
    <AccordionItem value={`event-${event.id}`}>
      <AccordionTrigger>
        <div className="flex justify-between w-full">
          <span>{event.title}</span>
          <span className="text-muted-foreground">
            {event.event_sessions.length} session(s)
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {event.futureSessions
          .sort(
            (a, b) =>
              new Date(a.start_time).getTime() -
              new Date(b.start_time).getTime()
          )
          .map((session) => (
            <Session key={session.id} session={session} />
          ))}
      </AccordionContent>
    </AccordionItem>
  );
}

type SessionWithSessionHostURL = EventSession & {
  host_after_domain: string;
};

function Session({ session }: { session: SessionWithSessionHostURL }) {
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const hostUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${session.host_after_domain}`
      : session.host_after_domain;

  const copyHostUrl = () => {
    navigator.clipboard
      .writeText(hostUrl)
      .then(() => alert("Host URL copied to clipboard!"))
      .catch((err) => console.error("Failed to copy: ", err));
  };

  return (
    <Card className="mb-4">
      <CardContent className="flex justify-between items-center p-4">
        <div>
          <p className="font-bold underline text-gray-700">{session.title}</p>
          <p className="font-semibold">{formatDate(session.start_time)}</p>
          <p className="text-muted-foreground">
            {session.location_name || "Virtual"}
          </p>
        </div>
        <Button variant="outline" onClick={copyHostUrl}>
          Copy Host URL
        </Button>
      </CardContent>
    </Card>
  );
}

export default function HostTools({ loaderData }: Route.ComponentProps) {
  if (loaderData.unauthorized) {
    return <div>Unauthorized</div>;
  }

  const { data, isLoading, error } = useQuery(
    orpcFetchQuery.listEventsWithSessionHostURLsInFuture.queryOptions({
      input: {
        pw: loaderData.providedPw!,
      },
    })
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {data?.map((event) => (
        <EventAccordion key={event.id} event={event} />
      ))}
    </Accordion>
  );
}
