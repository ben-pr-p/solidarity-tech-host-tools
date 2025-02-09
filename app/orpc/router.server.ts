import {
  os,
  ORPCError,
  type InferRouterInputs,
  type InferRouterOutputs,
} from "@orpc/server";
import { z } from "zod";
import { config } from "@/config.server";
import {
  createEventAttendance,
  getEvent,
  listEventAttendances,
  listEventRSVPs,
  listEvents,
  listEventSessions,
  deleteEventAttendance,
} from "@/lib/solidarity.server";
import { decrypt, encrypt } from "@/lib/encrypt.server";
// type MyDB = Awaited<ReturnType<typeof getKysely>>;

type ORPCContext = {
  // db: MyDB;
};

// DB is inserted in request handler or test driver
const base = os.context<ORPCContext>().use(async ({ next, path, context }) => {
  try {
    const result = await next({ context });
    return result;
  } catch (e) {
    console.error(e);
    // do something on error
    throw new ORPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  } finally {
    // do something on finish
  }
});

export const router = base.router({
  listEventsWithSessionHostURLsInFuture: base
    .input(z.object({ pw: z.string() }))
    .handler(async ({ input, context }) => {
      const searchParamsPw = input.pw;
      if (searchParamsPw !== config.ADMIN_PASSWORD) {
        throw new ORPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
          status: 401,
        });
      }

      const events = await listEvents();

      return events.data
        .map((event) => {
          const futureSessions = event.event_sessions.filter(
            (session) => new Date(session.start_time) > new Date()
          );

          const futureSessionsWithHostURLs = futureSessions.map((session) => {
            const encryptedSessionHostURLKey = encrypt({
              eventId: event.id,
              sessionId: session.id,
            });

            const hostUrl = new URL(`${config.BASE_URL}/host`);
            hostUrl.searchParams.set("eventKey", encryptedSessionHostURLKey);

            return {
              ...session,
              host_url: hostUrl.toString(),
            };
          });

          return { ...event, futureSessions: futureSessionsWithHostURLs };
        })
        .filter((event) => event.futureSessions.length > 0);
    }),

  getEventWithSessionById: base
    .input(z.object({ eventKey: z.string() }))
    .handler(async ({ input, context }) => {
      const { eventId, sessionId } = decrypt(input.eventKey);
      const response = await getEvent(eventId);
      const event = response.data;
      const session = event.event_sessions.find(
        (session) => session.id === sessionId
      );
      return { event, session };
    }),

  getSessionRsvpsByEventIdAndSessionId: base
    .input(z.object({ eventKey: z.string() }))
    .handler(async ({ input, context }) => {
      const { eventId, sessionId } = decrypt(input.eventKey);
      const [sessionRsvps, sessionAttendances] = await Promise.all([
        listEventRSVPs({
          event_id: eventId,
          session_id: sessionId,
        }).then((response) => response.data),
        listEventAttendances({
          event_id: eventId,
          session_id: sessionId,
        }).then((response) => response.data),
      ]);

      const rsvpsWithUserDetailsAndAttendance = sessionRsvps.map((rsvp) => ({
        ...rsvp,
        attended: sessionAttendances.some(
          (attendance) => attendance.user_id === rsvp.user_id
        ),
      }));

      return rsvpsWithUserDetailsAndAttendance;
    }),

  markAttended: base
    .input(
      z.object({
        eventKey: z.string(),
        userId: z.number(),
      })
    )
    .handler(async ({ input, context }) => {
      const { eventId, sessionId } = decrypt(input.eventKey);
      const payload = {
        event_id: eventId,
        event_session_id: sessionId,
        user_id: input.userId,
        attended: true,
      };
      const response = await createEventAttendance(payload);
      return response.data;
    }),

  deleteAttendance: base
    .input(
      z.object({
        eventKey: z.string(),
        userId: z.number(),
      })
    )
    .handler(async ({ input, context }) => {
      const { eventId, sessionId } = decrypt(input.eventKey);
      // Fetch existing attendances to find the attendance ID
      const attendancesResponse = await listEventAttendances({
        event_id: eventId,
        session_id: sessionId,
      });

      const attendanceToDelete = attendancesResponse.data.find(
        (attendance) =>
          attendance.event_session_id === sessionId &&
          attendance.user_id === input.userId
      );

      if (!attendanceToDelete) {
        throw new ORPCError({
          code: "NOT_FOUND",
          message: "Attendance record not found",
        });
      }

      // Delete the attendance record
      await deleteEventAttendance(attendanceToDelete.id);
      return { success: true };
    }),
});

export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
