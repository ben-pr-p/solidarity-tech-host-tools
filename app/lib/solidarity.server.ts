import { getConfig, type Config } from "@/config.server";

/*
API documentation: https://docs.solidarity.tech/reference/get_events-id
  
Excerpts:

## List events
curl --request GET \
     --url 'https://api.solidarity.tech/v1/events?_limit=20&_offset=5&_since=0' \
     --header 'authorization: Bearer SOLIDARITY_TECH_API_KEY'

## List event
curl --request GET \
  --url https://api.solidarity.tech/v1/events/13 \
     --header 'authorization: Bearer SOLIDARITY_TECH_API_KEY'

## List event sessions
curl --request GET \
     --url 'https://api.solidarity.tech/v1/event_sessions?_limit=20&_offset=5&_since=0&event_id=13' \
     --header 'authorization: Bearer SOLIDARITY_TECH_API_KEY'

## Get event session
curl --request GET \
     --url 'https://api.solidarity.tech/v1/event_sessions/1314' \
     --header 'authorization: Bearer SOLIDARITY_TECH_API_KEY'

## List event RSVPs
curl --request GET \
     --url 'https://api.solidarity.tech/v1/event_rsvps?_limit=20&_offset=0&_since=0&event_id=0' \
     --header 'authorization: Bearer SOLIDARITY_TECH_API_KEY'

## List event attendances
curl --request GET \
     --url 'https://api.solidarity.tech/v1/event_attendances?_limit=20&_offset=0&_since=0&event_id=0' \
     --header 'authorization: Bearer SOLIDARITY_TECH_API_KEY'

## Create event attendance
curl --request POST \
     --url https://api.solidarity.tech/v1/event_attendances \
     --header 'authorization: Bearer SOLIDARITY_TECH_API_KEY' \
     --header 'content-type: application/json' \
     --data '
{
  "attended": true,
  "event_id": 13,
  "event_session_id": 1314,
  "user_id": 76
}
'

## Delete event attendance
curl --request DELETE \
     --url https://api.solidarity.tech/v1/event_attendances/id




## RSVP A New Person
-- Create new person
curl --request POST \
     --url https://api.solidarity.tech/v1/users \
     --header 'content-type: application/json' \
     --data '
{
  "phone_number": "2145555555",
  "email": "fakeemail@email.com",
  "first_name": "First",
  "last_name": "last",
  "sms_permission": true,
  "call_permission": true,
  "email_permission": true
}
'

-- RSVP to event
curl --request POST \
     --url https://api.solidarity.tech/v1/event_rsvps \
     --header 'content-type: application/json' \
     --data '
{
  "is_attending": "yes",
  "event_id": 10,
  "event_session_id": 103,
  "user_id": 1,
  "is_confirmed": true,
  "source": "host-toolkit",
  "source_system": "host-toolkit"
}
'

*/

// Request Types
export interface ListEventsParams {
  limit?: number;
  offset?: number;
  since?: string; // ISO string
}

export interface ListEventSessionsParams {
  limit?: number;
  offset?: number;
  since?: number;
  event_id: number;
}

export interface ListEventRSVPsParams {
  limit?: number;
  offset?: number;
  since?: number;
  event_id: number;
  session_id: number;
}

export interface ListEventAttendancesParams {
  limit?: number;
  offset?: number;
  since?: number;
  event_id: number;
  session_id: number;
}

export interface CreateEventAttendanceParams {
  attended: boolean;
  event_id: number;
  event_session_id: number;
  user_id: number;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string | number | undefined>;
  body?: unknown;
}

// Response Types
export interface PaginationMeta {
  total_count: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: PaginationMeta;
}

export interface LocationData {
  full_address: string;
}

export interface AutomationStatus {
  rsvp_confirmation_email: boolean;
  rsvp_confirmation_text: boolean;
  day_before_email_reminder: boolean;
  day_before_text_reminder: boolean;
  day_of_email_reminder: boolean;
  day_of_text_reminder: boolean;
}

export interface EventSession {
  id: number;
  mobilize_event_id: number;
  start_time: string;
  end_time: string;
  title: string;
  created_at: string;
  updated_at: string;
  location_name: string | null;
  location_data: LocationData;
  lonlat: null;
  location_address: string;
  show_rsvp_bar: boolean;
  show_title_in_form: boolean;
  max_capacity: number;
}

export interface Event {
  id: number;
  title: string;
  scope_id: number;
  scope_type: string;
  event_type: string;
  location_name: string | null;
  location_data: LocationData | null;
  event_sessions: EventSession[];
  event_page_url: string;
  // rsvps_count: number;
  // attendance_count: number;
  automation_status: AutomationStatus;
  created_at: string;
}

export interface SimpleEventSession {
  id: number;
  event_id: number;
  start_time: string;
  end_time: string;
  title: string;
  created_at: string;
  location_name: string | null;
  location_address: string;
  show_rsvp_bar: boolean;
  show_title_in_form: boolean;
}

export interface EventAttendance {
  id: number;
  event_id: number;
  event_session_id: number;
  user_id: number;
  attended: boolean;
  created_at: string;
}

export interface EventRSVP {
  id: number;
  event_id: number;
  event_session_id: number;
  user_id: number;
  user_details: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  is_attending: "yes" | "no" | string;
  is_confirmed: boolean | null;
  agent_user_id: number;
  source: string;
  source_system: string;
  created_at: string;
  updated_at: string;
}

interface CreateUserParams {
  phone_number: string;
  email: string;
  first_name: string;
  last_name: string;
  sms_permission?: boolean;
  call_permission?: boolean;
  email_permission?: boolean;
}

interface CreateEventRSVPParams {
  is_attending: "yes" | "no";
  event_id: number;
  event_session_id: number;
  user_id: number;
  is_confirmed?: boolean;
  source?: string;
  source_system?: string;
  agent_user_id: number;
}

interface RsvpNewPersonParams {
  person: CreateUserParams;
  event_id: number;
  event_session_id: number;
}

export function getSolidarity(config: Config) {
  const BASE_URL = "https://api.solidarity.tech/v1";

  const getHeaders = () => ({
    authorization: `Bearer ${config.SOLIDARITY_TECH_API_KEY}`,
    "content-type": "application/json",
  });

  async function apiRequest<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = "GET", params, body } = options;
    let url = `${BASE_URL}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    const timeEventKey = `apiRequest ${url}`;
    console.time(timeEventKey);
    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const jsonResponse = await response.json();
    console.timeEnd(timeEventKey);
    return jsonResponse as T;
  }

  async function fetchAllPages<T>(
    fetchPage: (limit: number, offset: number) => Promise<ApiResponse<T[]>>,
    params: { limit?: number; offset?: number } = {}
  ): Promise<ApiResponse<T[]>> {
    const allData: T[] = [];
    let offset = params.offset || 0;
    const limit = params.limit || 100;

    while (true) {
      const response = await fetchPage(limit, offset);
      allData.push(...response.data);

      if (response.data.length < limit) {
        // Last page reached
        return {
          data: allData,
          meta: {
            ...response.meta,
            total_count: allData.length,
            offset: 0,
          },
        };
      }

      offset += limit;
    }
  }

  async function listEventsPage(
    params: ListEventsParams
  ): Promise<ApiResponse<Event[]>> {
    return apiRequest("/events", {
      params: {
        _limit: params.limit,
        _offset: params.offset,
        _since: params.since,
      },
    });
  }

  async function listEvents(
    params: ListEventsParams = {}
  ): Promise<ApiResponse<Event[]>> {
    return fetchAllPages(
      (limit, offset) =>
        apiRequest("/events", {
          params: {
            _limit: limit,
            _offset: offset,
            _since: params.since,
          },
        }),
      params
    );
  }

  async function getEvent(eventId: number): Promise<ApiResponse<Event>> {
    return apiRequest(`/events/${eventId}`);
  }

  async function getEventSession(
    eventSessionId: number
  ): Promise<ApiResponse<EventSession>> {
    return apiRequest(`/event_sessions/${eventSessionId}`);
  }

  async function listEventSessions(
    params: ListEventSessionsParams
  ): Promise<ApiResponse<SimpleEventSession[]>> {
    return apiRequest("/event_sessions", {
      params: {
        _limit: params.limit,
        _offset: params.offset,
        _since: params.since,
        event_id: params.event_id,
      },
    });
  }

  async function listEventRSVPs(
    params: ListEventRSVPsParams
  ): Promise<ApiResponse<EventRSVP[]>> {
    return fetchAllPages(
      (limit, offset) =>
        apiRequest("/event_rsvps", {
          params: {
            _limit: limit,
            _offset: offset,
            _since: params.since,
            event_id: params.event_id,
            session_id: params.session_id,
          },
        }),
      params
    );
  }

  async function listEventAttendances(
    params: ListEventAttendancesParams
  ): Promise<ApiResponse<EventAttendance[]>> {
    return fetchAllPages(
      (limit, offset) =>
        apiRequest("/event_attendances", {
          params: {
            _limit: limit,
            _offset: offset,
            _since: params.since,
            event_id: params.event_id,
            session_id: params.session_id,
          },
        }),
      params
    );
  }

  async function createEventAttendance(
    params: CreateEventAttendanceParams
  ): Promise<ApiResponse<EventAttendance>> {
    return apiRequest("/event_attendances", {
      method: "POST",
      body: params,
    });
  }

  async function deleteEventAttendance(
    attendanceId: number
  ): Promise<ApiResponse<void>> {
    return apiRequest(`/event_attendances/${attendanceId}`, {
      method: "DELETE",
    });
  }

  async function createUser(params: CreateUserParams): Promise<{ id: number }> {
    return apiRequest("/users", {
      method: "POST",
      body: params,
    });
  }

  async function createEventRSVP(
    params: CreateEventRSVPParams
  ): Promise<ApiResponse<EventRSVP>> {
    return apiRequest("/event_rsvps", {
      method: "POST",
      body: params,
    });
  }

  async function rsvpNewPerson(
    params: RsvpNewPersonParams
  ): Promise<{ success: boolean }> {
    // Create the new user first
    const newUser = await createUser({
      ...params.person,
      sms_permission: params.person.sms_permission ?? true,
      call_permission: params.person.call_permission ?? true,
      email_permission: params.person.email_permission ?? true,
    });

    // Then create the RSVP
    await createEventRSVP({
      is_attending: "yes",
      event_id: params.event_id,
      event_session_id: params.event_session_id,
      agent_user_id: config.CREATE_RSVP_AGENT_USER_ID,
      user_id: newUser.id,
      is_confirmed: true,
      source: "host-toolkit",
      source_system: "host-toolkit",
    });

    return { success: true };
  }

  return {
    listEvents,
    listEventsPage,
    // getEvent,
    getEventSession,
    listEventSessions,
    listEventRSVPs,
    listEventAttendances,
    createEventAttendance,
    deleteEventAttendance,
    createUser,
    createEventRSVP,
    rsvpNewPerson,
  };
}

/*
USED FOR GENERATING TYPES ONLY

export async function main() {
  // List events
  const events = await listEvents({ limit: 20 });
  // debugPrint("Events", events);

  // Get first event's details (assuming we got at least one event)
  if (events.data.length > 0) {
    const eventId = events.data[0].id;

    // Get single event
    const event = await getEvent(eventId);
    // debugPrint("Single Event", event);

    // List sessions for this event
    const sessions = await listEventSessions({ event_id: eventId, limit: 20 });
    // debugPrint("Event Sessions", sessions);

    // list rsvps for this event
    const rsvps = await listEventRSVPs({ event_id: eventId, limit: 20 });
    debugPrint("Event RSVPs", rsvps);

    // List attendances for this event
    // const attendances = await listEventAttendances({
    //   event_id: eventId,
    //   limit: 20,
    // });
    // debugPrint("Event Attendances", attendances);
  }
}

function debugPrint(label: string, json: unknown) {
  console.log(`${label}: ${JSON.stringify(truncateJsonPrint(json), null, 2)}`);
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonArray = JsonValue[];

function truncateJsonPrint(json: unknown): JsonValue {
  if (Array.isArray(json)) {
    return json.slice(0, 2).map(truncateJsonPrint);
  }

  if (typeof json === "object" && json !== null) {
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [
        key,
        truncateJsonPrint(value),
      ])
    );
  }

  return json as JsonValue;
}

main().then(console.log).catch(console.error);
*/
