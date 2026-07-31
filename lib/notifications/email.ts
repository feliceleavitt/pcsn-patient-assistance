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

export async function sendNewSubmissionNotification() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("Skipping submission notification: RESEND_API_KEY is not set.");
    return;
  }

  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!from) {
    console.warn(
      "Skipping submission notification: NOTIFICATION_FROM_EMAIL is not set.",
    );
    return;
  }

  const adminUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/admin`
    : "the PCSN volunteer dashboard";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: getNotificationRecipients(),
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
    });

    if (response.ok) return;
    console.error(
      `Unable to send submission notification: ${response.status} ${await response.text()}`,
    );
  } catch (error) {
    console.error("Unable to send submission notification:", error);
  }
}
