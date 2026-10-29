const defaultRecipients = [
  "Suzanne.Victor@pcsnetwork.org",
  "sam.Martin@pcsnetwork.org",
  "jenny.martin@pcsnetwork.org",
  "feliceleavitt01@gmail.com",
];

function getNotificationRecipients() {
  return (
    process.env.NOTIFICATION_RECIPIENTS?.split(",")
      .map((recipient) => recipient.trim())
      .filter(Boolean) ?? defaultRecipients
  );
}

type EmailMessage = {
  to: string;
  idempotencyKey?: string;
  subject: string;
  text: string;
  allowConfiguredPreviewRecipient?: boolean;
  allowApprovedPreviewInvitation?: boolean;
};

export type StagingInvitationDelivery =
  | { accepted: true }
  | {
      accepted: false;
      reason:
        | "preview_delivery_not_allowed"
        | "email_provider_not_configured"
        | "sender_not_configured"
        | "provider_rejected"
        | "provider_unavailable";
    };

function senderDomain(from: string) {
  const address = from.match(/<([^>]+)>/)?.[1] ?? from;
  return address.trim().toLowerCase().split("@")[1] ?? null;
}

export type StagingInvitationPreflight =
  | { ready: true }
  | { ready: false; reason: "email_provider_not_configured" | "sender_not_configured" | "provider_unavailable" | "sender_domain_unverified" | "provider_rejected" };

export async function preflightStagingVolunteerInvitation(): Promise<StagingInvitationPreflight> {
  if (process.env.VERCEL_ENV !== "preview" || !process.env.RESEND_API_KEY) return { ready: false, reason: "email_provider_not_configured" };
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  const domain = from ? senderDomain(from) : null;
  if (!domain) return { ready: false, reason: "sender_not_configured" };
  try {
    const response = await fetch("https://api.resend.com/domains?limit=100", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!response.ok) return { ready: false, reason: "provider_rejected" };
    const payload = await response.json() as { data?: Array<{ name?: string; status?: string; capabilities?: { sending?: string } }> };
    const matchingDomain = payload.data?.find((candidate) => candidate.name?.toLowerCase() === domain);
    return matchingDomain?.status === "verified" && matchingDomain.capabilities?.sending === "enabled"
      ? { ready: true }
      : { ready: false, reason: "sender_domain_unverified" };
  } catch {
    return { ready: false, reason: "provider_unavailable" };
  }
}

async function sendEmail({ to, subject, text, idempotencyKey, allowConfiguredPreviewRecipient, allowApprovedPreviewInvitation }: EmailMessage) {
  const isPreview = process.env.VERCEL_ENV === "preview";
  const configuredRecipient = process.env.STAGING_TEST_EMAIL_RECIPIENT?.trim().toLowerCase();
  const isAllowedPreviewInvitation = isPreview && (
    allowApprovedPreviewInvitation === true ||
    (allowConfiguredPreviewRecipient === true && configuredRecipient !== undefined && to.trim().toLowerCase() === configuredRecipient)
  );

  if ((isPreview && !isAllowedPreviewInvitation) ||
      (!isAllowedPreviewInvitation && process.env.DISABLE_OUTBOUND_EMAIL === "true")) {
    console.warn("Skipping email notification: outbound email is disabled.");
    return false;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("Skipping email notification: RESEND_API_KEY is not set.");
    return false;
  }

  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!from) {
    console.warn(
      "Skipping email notification: NOTIFICATION_FROM_EMAIL is not set.",
    );
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
    }),
  });

  if (response.ok) return true;

  console.error(
    `Unable to send email notification: HTTP ${response.status}`,
  );
  return false;
}

export async function sendPatientPasswordReset(patientEmail: string, resetUrl: string) {
  return sendEmail({
    to: patientEmail,
    subject: "Reset your PCSN patient portal password",
    text: [
      "A password reset was requested for your Phoenix Cancer Support Network patient portal account.",
      "",
      "Use this secure one-time link to choose a new password:",
      resetUrl,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
  });
}

export async function sendNewSubmissionNotification() {
  const adminUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/admin`
    : "the PCSN volunteer dashboard";

  try {
    await Promise.all(
      getNotificationRecipients().map((recipient) =>
        sendEmail({
          to: recipient,
          subject: "New PCSN assistance request submitted",
          text: [
            "A new Phoenix Cancer Support Network assistance request has been submitted.",
            "",
            "Please sign in to the volunteer dashboard to review it.",
            "",
            `Dashboard: ${adminUrl}`,
            "",
            "This notification does not include patient information.",
          ].join("\n"),
        }),
      ),
    );
  } catch (error) {
    console.error("Unable to send submission notification:", error);
  }
}

export async function sendPatientSubmissionConfirmation(patientEmail: string) {
  try {
    await sendEmail({
      to: patientEmail,
      subject: "Your PCSN assistance application was submitted",
      text: [
        "Your Phoenix Cancer Support Network assistance application was submitted.",
        "",
        "A PCSN volunteer will review your information and contact you if anything is missing or if more information is needed.",
        "",
        "Many programs send status updates directly by mail or email. Some programs may contact you, your provider, or PCSN directly.",
        "",
        "Please do not submit the form again unless your information changes.",
        "",
        "This confirmation does not include medical or financial information.",
      ].join("\n"),
    });
  } catch (error) {
    console.error("Unable to send patient confirmation:", error);
  }
}

export async function sendPatientSignatureRequest(patientEmail: string, signatureUrl: string) {
  try {
    await sendEmail({
      to: patientEmail,
      subject: "PCSN document ready for your signature",
      text: [
        "Phoenix Cancer Support Network has a document ready for your review and electronic signature.",
        "",
        "Please sign in securely to review and sign it:",
        signatureUrl,
        "",
        "This email does not include medical or financial information.",
      ].join("\n"),
    });
  } catch (error) {
    console.error("Unable to send signature request:", error);
  }
}

export async function sendVolunteerPasswordReset(email: string, resetUrl: string, idempotencyKey: string) {
  return sendEmail({
    to: email,
    idempotencyKey,
    allowConfiguredPreviewRecipient: true,
    subject: "Reset your PCSN volunteer portal password",
    text: [
      "A password reset was requested for your Phoenix Cancer Support Network volunteer account.",
      "", "Use this one-time link to choose a new password. It expires within 30 minutes:",
      resetUrl, "", "If you did not request this, ignore this email. Your password has not changed.",
    ].join("\n"),
  });
}

export async function sendStagingVolunteerSetup(email: string, setupUrl: string, idempotencyKey: string) {
  if (process.env.VERCEL_ENV !== "preview") {
    return { accepted: false, reason: "preview_delivery_not_allowed" } as const;
  }
  try {
    const delivered = await sendEmail({
    to: email,
    idempotencyKey,
    allowApprovedPreviewInvitation: true,
    subject: "Set up your PCSN staging volunteer account",
    text: [
      "You have been invited to the test version of the PCSN Patient Assistance Portal.",
      "",
      "This staging site uses fictional patient records only. Do not enter or upload real patient information.",
      "",
      "Use this private, single-use link to create your password:",
      setupUrl,
      "",
      "Afterward, sign in at:",
      "https://pcsn-patient-assistance-git-codex-audited-catalog-preview-pcsn.vercel.app/admin/login",
      "",
      "If you did not expect this invitation, ignore this email.",
    ].join("\n"),
  });
    return delivered
      ? ({ accepted: true } as const)
      : ({ accepted: false, reason: "provider_rejected" } as const);
  } catch {
    return { accepted: false, reason: "provider_unavailable" } as const;
  }
}
