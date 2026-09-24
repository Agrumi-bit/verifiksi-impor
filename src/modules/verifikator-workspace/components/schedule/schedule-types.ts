import type { AssignmentStatusValue } from "../../status";

export type ScheduleItem = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  status: AssignmentStatusValue;
  scheduledDate: string | null;
  scheduledTime: string | null;
  location: string | null;
};
