export const CRM_ACTIVITY_TYPE_OPTIONS = [
    { value: "task", label: "Task" },
    { value: "call", label: "Call" },
    { value: "email", label: "Email" },
    { value: "meeting", label: "Meeting" },
] as const;

export type CrmActivityTypeValue = (typeof CRM_ACTIVITY_TYPE_OPTIONS)[number]["value"];
