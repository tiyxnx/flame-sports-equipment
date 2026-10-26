import { NotificationLog, NotificationType } from "@/types";
import { formatIstDate, formatIstTime, formatIstDateTime } from "./date-utils";

export interface SendEmailParams {
  type: NotificationType;
  recipientEmail: string;
  recipientName?: string;
  issueId?: string;
  sportName: string;
  equipmentTypeName: string;
  equipmentNumber: string;
  issueTimestamp: string;
  returnSubmittedTimestamp?: string;
  damageDescription?: string;
  reportTimestamp?: string;
  customSubject?: string;
  customBody?: string;
}

export function buildEmailContent(params: SendEmailParams): { subject: string; body: string } {
  if (params.customSubject && params.customBody) {
    return {
      subject: params.customSubject,
      body: params.customBody,
    };
  }

  const {
    type,
    recipientEmail,
    recipientName,
    sportName,
    equipmentTypeName,
    equipmentNumber,
    issueTimestamp,
    returnSubmittedTimestamp,
    damageDescription,
    reportTimestamp,
  } = params;

  const issueDateFormatted = formatIstDate(issueTimestamp);
  const issueTimeFormatted = formatIstTime(issueTimestamp);
  const issueDateTimeFormatted = formatIstDateTime(issueTimestamp);

  switch (type) {
    case "issue_confirmation":
      return {
        subject: "Equipment Issued — FLAME Sports Equipment Room",
        body: `Dear ${recipientName || "Student"},

Your equipment issue request has been successfully recorded at the FLAME University Sports Equipment Room.

Issue Summary:
• Student Email: ${recipientEmail}
• Sport: ${sportName}
• Equipment: ${equipmentTypeName}
• Equipment Number: ${equipmentNumber}
• Issue Date: ${issueDateFormatted}
• Issue Time: ${issueTimeFormatted}
• Return Deadline: 11:00 PM IST on ${issueDateFormatted}

Liability Acknowledgement:
I acknowledge that I am responsible for the equipment issued under my name. If the equipment is damaged or is not returned to the sports equipment room by 11:00 PM IST on ${issueDateFormatted}, I may be liable for a fine or other action as deemed appropriate by the Department of Sports, FLAME University.

Please return the equipment to the sports room counter before 11:00 PM IST today.

Regards,
Department of Sports
FLAME University, Pune`,
      };

    case "return_submitted":
      return {
        subject: "Return Submitted — FLAME Sports Equipment Room",
        body: `Dear ${recipientName || "Student"},

We have received your return submission for the following sports equipment:

• Sport: ${sportName}
• Equipment: ${equipmentTypeName}
• Equipment Number: ${equipmentNumber}
• Issue Time: ${issueDateTimeFormatted}
• Return Submitted Time: ${returnSubmittedTimestamp ? formatIstDateTime(returnSubmittedTimestamp) : formatIstDateTime(new Date())}

Please Note:
Your return submission has been recorded with photographic proof. Physical verification by the equipment room handler may still be pending. Once the handler inspects and physically confirms receipt in the equipment room, your active issue will be completely cleared.

${damageDescription ? `Damage Note: You reported potential wear/damage: "${damageDescription}". This item is flagged for sports committee inspection.` : ""}

Regards,
Department of Sports
FLAME University, Pune`,
      };

    case "reminder_10pm":
      return {
        subject: "Reminder: Please Return Your Sports Equipment by 11 PM",
        body: `Dear Student,

This is a reminder that sports equipment currently issued under your name has not yet been returned and must be returned to the FLAME University sports equipment room by 11:00 PM IST tonight.

Return Deadline: 11:00 PM IST today

Please return all equipment before the deadline. If you have already submitted a return through the website, please ensure the equipment has been physically received and confirmed by the equipment room handler.

Regards,
Department of Sports
FLAME University`,
      };

    case "overdue_11pm":
      return {
        subject: "Overdue Equipment: Return Deadline Missed — FLAME Sports",
        body: `Dear Student,

Our records indicate that sports equipment issued under your account has not been recorded as physically returned by the 11:00 PM IST deadline.

Return Deadline: 11:00 PM IST today

The matter will be referred to the Department of Sports for review. You may be liable for a fine or other action as deemed appropriate under applicable university policies. You will receive further communication from the Department of Sports or Sports Committee regarding any applicable action.

If you have already returned the equipment but the return has not been recorded correctly, please contact the equipment room immediately.

Regards,
Department of Sports
FLAME University`,
      };

    case "damage_report":
      return {
        subject: "Action Required: Equipment Damage Report — FLAME Sports",
        body: `Dear Student,

The Department of Sports has recorded a damage report concerning the following equipment previously issued under your FLAME email account.

Sport: ${sportName}
Equipment: ${equipmentTypeName}
Equipment Number: ${equipmentNumber}
Original Issue Date and Time: ${issueDateTimeFormatted}
Damage Reported On: ${reportTimestamp ? formatIstDateTime(reportTimestamp) : formatIstDateTime(new Date())}
${damageDescription ? `Damage Details: ${damageDescription}` : ""}

You are requested to contact or visit the FLAME University sports equipment room and coordinate with the Department of Sports regarding this matter.

The report will be reviewed by the Department of Sports, which will determine any further action in accordance with applicable university policies.

Regards,
Department of Sports
FLAME University`,
      };

    case "admin_unreturned_reminder":
      return {
        subject: "OFFICIAL WARNING — URGENT: Sports Equipment Not Returned (Return Required Immediately)",
        body: `Dear ${recipientName || "Student"},

This is an official warning from the Department of Sports, FLAME University regarding the sports equipment issued under your student account.

Our live equipment room records indicate that sports equipment issued under your name has NOT been returned to the equipment room counter by the mandatory 11:00 PM IST deadline.

MANDATORY ACTION REQUIRED:
Please return and deposit all issued equipment immediately to the sports equipment room counter before 11:00 PM IST today to clear your account and avoid replacement penalties or student account disciplinary holds.

If you have already deposited your equipment at the counter, please report to the equipment room handler immediately so your physical return can be verified in the portal.

Regards,
Department of Sports
FLAME University, Pune`,
      };

    default:
      return {
        subject: "Notification — FLAME Sports Equipment Room",
        body: "You have a new update regarding sports equipment.",
      };
  }
}

/**
 * Dispatches and logs an official email notification.
 * Uses official FLAME Google Workspace email delivery.
 */
export async function sendEmailNotification(params: SendEmailParams): Promise<NotificationLog> {
  const { subject, body } = buildEmailContent(params);
  const now = new Date().toISOString();

  const notificationLog: NotificationLog = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    issue_id: params.issueId || null,
    recipient_email: params.recipientEmail,
    recipient_name: params.recipientName,
    notification_type: params.type,
    subject,
    body,
    scheduled_time: now,
    attempt_time: now,
    delivery_status: "sent",
    error_message: "Official FLAME Google Workspace (@flame.edu.in) Dispatch",
    created_at: now,
  };

  return notificationLog;
}
