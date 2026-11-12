// How the Twelve app works, written for the help agent to answer rep questions from.
// Keep it in sync when screens change. Plain markdown; the brain splits it on headings.
// Draft content (before Chase's review): wording and team policies here are placeholders.

export const APP_GUIDE = `
# How to use the Twelve app

Twelve is the TWELVE (RUN XII) team's training app. It works in the phone's browser at twelve-hazel.vercel.app. Add it to your home screen so it opens like an app: on iPhone, open it in Safari, tap Share, then "Add to Home Screen". On Android, open it in Chrome, tap the ⋮ menu, then "Add to Home screen" or "Install app".

## Logging in

You log in with your phone number. Type it in, tap "Text me a code", then enter the 6-digit code from the text. There's no password.
If the code doesn't come: wait a minute, check you typed the right number, and tap "Text me a code" again. Use the newest code if you asked for more than one.
If it says you're not invited: only invited numbers can get in. Ask your leader or the TWELVE leadership team to add your number.

## The tabs

- Today: your training for today, your streak, and what's next.
- Track: your whole 60-day plan, week by week. Locked weeks show a lock.
- Practice: AI role play against practice homeowners, by voice or by text.
- Recordings: record or upload real conversations and get coached by Chase.
- Me: your profile and sign out.
The "?" Help button opens this chat.

## Your training track

Your track is 60 days, split into weeks. Each day has a few tasks: lessons (read or watch), quizzes, role plays, field tasks (log your doors, conversations, bills and appointments), and reflections.
A new day opens each day (Pacific time). You can go back and finish earlier days any time.
Your streak counts the days in a row you finished at least one task.

## Unlocking the next week

Each week ends with an assessment: a quiz and a role play. To unlock the next week you need to pass the week's assessment quiz and score at least the passing score (usually 70) on the end-of-week role play.
If you're stuck on a locked week, finish the last day's assessment quiz and role play. Leadership can also unlock a week for you if there's a good reason; ask in this chat.

## Quizzes

Pick your answers and submit. You'll see your score and which ones you missed. If you don't pass, review and tap Try again; any passing attempt counts. Assessment quizzes need the passing percent shown on the quiz.

## Role play (Practice tab)

Pick a practice homeowner (Busy Brenda, Skeptic Steve, and others). Choose Voice to talk out loud, or Type instead to text back and forth.
Voice: allow the microphone when your phone asks. The homeowner speaks first. Talk naturally; you can interrupt them. Tap End when you're done and you'll get a score.
Door role plays cap at 6 minutes and table role plays at 20 minutes. Voice practice is limited to 30 minutes a day per rep; text practice is unlimited.
Your score shows the one thing to fix, the exact line Chase would say, what you did well, and a score for each skill. Tap "Run it again" to retry.
If voice says "Microphone blocked": open your phone's settings for your browser (Safari or Chrome), allow the microphone for this site, then reload the app.
If voice won't connect: check your signal or Wi-Fi and try again, or use Type instead.

## Recordings (getting coached on real conversations)

You must have the homeowner's okay to record. California requires everyone in the conversation to agree. Before recording, ask: "Our team records some meetings for training and quality. Are you okay with me recording this one?" Once recording, say: "This call's being recorded, you're good with that?" so their yes is on the recording.
Two ways to send a recording:
1. Record in the app: Recordings tab, tap "● Record", pick door or table, tap the red Record button. Keep the app open and the phone unlocked until you tap Stop. If you leave the app, recording stops but everything up to then is saved. Then add a short label, check the consent box, and tap "Send for coaching".
2. Upload a file: record with your phone's voice memo app or a Plaud (better for long table appointments, since they keep recording if you switch apps), then Recordings tab, "Upload a file". Plaud users export the audio from the Plaud app first.
Labels can't include homeowner names. Files must be under 50 MB for now (about 45 minutes of m4a).
What happens next: the audio is turned into text, checked for consent, and the AI drafts coaching notes. Chase reviews and approves them before you see them. Status "Processing" means it's being transcribed; "With Chase" means it's waiting on his review; "Checking consent" means the homeowner's okay wasn't heard and leadership is checking.
If a recording didn't upload (app closed or lost signal), open Recordings, tap "● Record", and the app offers to upload the unfinished recording.

## Help chat

Ask this chat anything about the app or your training. If it can't help, or you ask for a person, it brings in the TWELVE leadership team and they answer right here in the same chat.
For pay, commission, scheduling, or personal issues, ask for leadership in this chat.
If you're ever unsafe at a door, leave and call 911 first.
`;
