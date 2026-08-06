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
  subject: string;
  text: string;
};

async function sendEmail({ to, subject, text }: EmailMessage) {
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
    `Unable to send email notification to ${to}: ${response.status} ${await response.text()}`,
  );
  return false;
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
