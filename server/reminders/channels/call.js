// Phone-call channel — STUB ("Nori calls me to remind me").
//
// Provider research (2026-07): for scripted reminder calls the recommended
// adapter is Twilio Programmable Voice with TTS (~$0.014/min + ~$1.15/mo per
// number). The adapter shape to implement here:
//
//   import twilio from 'twilio';
//   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
//   export async function send(reminder, user, task) {
//     const call = await client.calls.create({
//       to: user.phone,                       // needs a users.phone column
//       from: process.env.TWILIO_FROM_NUMBER,
//       twiml: `<Response><Say>Hello, this is Nori, your family assistant. A reminder: ${task.title}.</Say></Response>`,
//     });
//     return call.sid;                        // provider SID for status tracking
//   }
//
// Upgrade path: if "Nori" should hold a conversation (answer questions,
// reschedule), swap the adapter for Retell AI (~$0.07/min, pay-as-you-go) —
// same send(reminder, user, task) contract, calling Retell's create-call API
// with an agent id instead of TwiML.
export async function send(reminder, user, task) {
  console.log(
    `[reminder:call] STUB — would CALL ${user.email} re: "${task?.title ?? 'ad-hoc reminder'}" (remindAt=${reminder.remind_at}). Configure a Twilio account to enable real calls.`
  );
}
