import {
  os,
  ORPCError,
  type InferRouterInputs,
  type InferRouterOutputs,
} from "@orpc/server";
import { z } from "zod";
import { getConfig, type Config } from "@/config.server";
import { getSolidarity } from "@/lib/solidarity.server";
import { getEncryptor } from "@/lib/encrypt.server";

type ORPCContext = {
  env: Config;
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
      if (searchParamsPw !== context.env.ADMIN_PASSWORD) {
        throw new ORPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
          status: 401,
        });
      }

      const solidarity = getSolidarity(context.env.SOLIDARITY_TECH_API_KEY);
      const encryptor = getEncryptor(context.env.SYMMETRIC_ENCRYPTION_KEY);
      const events = await solidarity.listEvents();

      return await Promise.all(
        events.data.map(async (event) => {
          const futureSessions = event.event_sessions.filter(
            (session) => new Date(session.start_time) > new Date()
          );

          const futureSessionsWithHostURLs = await Promise.all(
            futureSessions.map(async (session) => {
              const encryptedSessionHostURLKey = await encryptor.encrypt({
                eventId: event.id,
                sessionId: session.id,
              });

              const hostSearchParams = new URLSearchParams();
              hostSearchParams.set("eventKey", encryptedSessionHostURLKey);

              return {
                ...session,
                host_after_domain: `/host?${hostSearchParams.toString()}`,
              };
            })
          );

          return { ...event, futureSessions: futureSessionsWithHostURLs };
        })
      ).then((events) =>
        events.filter((event) => event.futureSessions.length > 0)
      );
    }),

  getEventWithSessionById: base
    .input(z.object({ eventKey: z.string() }))
    .handler(async ({ input, context }) => {
      const encryptor = getEncryptor(context.env.SYMMETRIC_ENCRYPTION_KEY);
      const { eventId, sessionId } = await encryptor.decrypt(input.eventKey);
      const solidarity = getSolidarity(context.env.SOLIDARITY_TECH_API_KEY);
      const response = await solidarity.getEvent(eventId);
      const event = response.data;
      const session = event.event_sessions.find(
        (session) => session.id === sessionId
      );
      return { event, session };
    }),

  getSessionRsvpsByEventIdAndSessionId: base
    .input(z.object({ eventKey: z.string() }))
    .handler(async ({ input, context }) => {
      const encryptor = getEncryptor(context.env.SYMMETRIC_ENCRYPTION_KEY);
      const { eventId, sessionId } = await encryptor.decrypt(input.eventKey);
      const solidarity = getSolidarity(context.env.SOLIDARITY_TECH_API_KEY);
      const [sessionRsvps, sessionAttendances] = await Promise.all([
        solidarity
          .listEventRSVPs({
            event_id: eventId,
            session_id: sessionId,
          })
          .then((response) => response.data),
        solidarity
          .listEventAttendances({
            event_id: eventId,
            session_id: sessionId,
          })
          .then((response) => response.data),
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
      const encryptor = getEncryptor(context.env.SYMMETRIC_ENCRYPTION_KEY);
      const { eventId, sessionId } = await encryptor.decrypt(input.eventKey);
      const payload = {
        event_id: eventId,
        event_session_id: sessionId,
        user_id: input.userId,
        attended: true,
      };
      const solidarity = getSolidarity(context.env.SOLIDARITY_TECH_API_KEY);
      const response = await solidarity.createEventAttendance(payload);
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
      const encryptor = getEncryptor(context.env.SYMMETRIC_ENCRYPTION_KEY);
      const { eventId, sessionId } = await encryptor.decrypt(input.eventKey);
      // Fetch existing attendances to find the attendance ID
      const solidarity = getSolidarity(context.env.SOLIDARITY_TECH_API_KEY);
      const attendancesResponse = await solidarity.listEventAttendances({
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
      await solidarity.deleteEventAttendance(attendanceToDelete.id);
      return { success: true };
    }),
});

export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
