"""
DRAFT curriculum for the Twelve LMS demo (Nov 2026).

Everything here is placeholder content written before Chase's real rubric, lessons and personas exist.
It is based on common door-to-door solar setter practice, kept honest and compliance-safe, and every
lesson is flagged is_draft_content = true so it can be swapped for Chase's material without code changes.

Run `python3 supabase/seed/build_seed.py` to regenerate the seed migration from this file.
"""

# ── Chase's rubric (draft): stage, skill, what good sounds like ──────────────────────────────
SKILLS = [
    # slug, name, stage, description, what_good_sounds_like
    ("approach", "Approach and opener", "door", "First 10 seconds: body language, intro, reason for being there.",
     "Steps back from the door, smiles, says who they are and why they're on the street in one breath."),
    ("pattern-interrupt", "Pattern interrupt", "door", "Breaking the homeowner's autopilot 'no' with a real question.",
     "Asks a specific, honest question about the homeowner's situation instead of a pitch."),
    ("tonality", "Tonality and pace", "door", "Calm, confident, downward inflection; matches the homeowner's energy.",
     "Sounds relaxed and certain, never rushed, never pleading."),
    ("bill-ask", "Getting the bill", "door", "Asking for the electric bill with a clear reason and making it easy.",
     "Explains why the bill matters and offers the easiest way to share it."),
    ("qualifying", "Qualifying", "door", "Homeowner, decision makers, roof, bill size, timing.",
     "Confirms the basics quickly and politely moves on when someone doesn't qualify."),
    ("objection-handling", "Smoke screens and objections", "door", "Acknowledge, question, redirect.",
     "Agrees first, asks one curious question, gives one honest reason to keep talking."),
    ("setting", "Setting the appointment", "door", "Both decision makers, a specific time, confirmed details.",
     "Offers two specific times, confirms both decision makers and contact details, sets expectations."),
    ("discovery", "Discovery", "table", "Uncovering why the homeowner would actually want to change.",
     "Asks open questions and lets the homeowner talk about their bill and their goals."),
    ("building-value", "Building value", "table", "Connecting the offer to what the homeowner said they care about.",
     "Ties every benefit back to something the homeowner said in their own words."),
    ("closing", "Closing and next steps", "table", "Asking for the decision and making the next step clear.",
     "Asks directly, stays quiet, and handles the answer calmly."),
    ("resilience", "Resilience", "mindset", "Staying steady after rejection and finishing the plan.",
     "Treats each no as data, resets fast, knocks the next door with the same energy."),
    ("honesty", "Honesty and compliance", "compliance", "Never misleading the homeowner about who we are or what they'll get.",
     "Says clearly who they are and never promises specific savings or 'free' anything."),
]

# ── Role-play homeowners (draft) ───────────────────────────────────────────────────────────────
PERSONAS = [
    dict(slug="busy-brenda", name="Busy Brenda", setting="door", difficulty=1, start_trust=4,
         backstory="Mom of three in a Corona tract home. It's 5:40pm, dinner is on the stove, kids are loud. "
                   "Her summer bills hit about $380 and she complains about them to her sister, but she has never looked at solar.",
         opening_line="Hi—sorry, we're in the middle of dinner. What is it?",
         objections=["I'm busy right now", "We're not interested", "Can you just leave a flyer?"],
         success_condition="giving you a photo of her latest electric bill or a time to come back when her husband is home"),
    dict(slug="diane-spouse", name="Diane, 'my husband handles that'", setting="door", difficulty=2, start_trust=5,
         backstory="Retired school teacher in Riverside. Friendly but defers every money decision to her husband Ray, "
                   "who gets home at 6. Their bill is around $250 and Ray grumbles about it.",
         opening_line="Oh hello there. Can I help you?",
         objections=["My husband handles all the bills", "He'd have to be here", "We're not doing anything without him"],
         success_condition="an appointment at a specific time when both she and Ray will be home"),
    dict(slug="skeptic-steve", name="Skeptic Steve", setting="door", difficulty=3, start_trust=3,
         backstory="Contractor in Temecula. His neighbor signed a solar deal with another company two years ago and says the savings "
                   "never showed up. Steve assumes every solar rep is a scammer. His bill is $420 in summer.",
         opening_line="Let me guess. Solar? Yeah, no. My neighbor got burned.",
         objections=["Solar's a scam", "My neighbor got burned", "You guys all say the same thing", "Just leave me your card"],
         success_condition="agreeing to show you his bill and let someone walk through real numbers with no pressure"),
    dict(slug="tom-maria", name="Tom and Maria, 'we need to think about it'", setting="table", difficulty=3, start_trust=5,
         backstory="Young couple in Menifee, two kids, both work. They liked the presentation but money feels tight and Maria "
                   "is nervous about committing. The real worry is whether the payment is truly lower than their bill.",
         opening_line="Okay, that all makes sense. We just like to sleep on big decisions.",
         objections=["We need to think about it", "We want to get other quotes", "Can you just email us the numbers?"],
         success_condition="the real concern coming out and either a decision or a firm follow-up time with both of them"),
    dict(slug="numbers-nate", name="Numbers Nate", setting="table", difficulty=4, start_trust=4,
         backstory="Engineer in Irvine with a spreadsheet open. He checks every claim, asks about rate escalators, roof age, "
                   "panel degradation and what happens if he moves in five years.",
         opening_line="Before you start, I've already modeled this. Show me your assumptions.",
         objections=["Your savings assumptions are optimistic", "What's the escalator?", "What if I sell the house in 5 years?",
                     "My roof is 14 years old"],
         success_condition="getting straight, honest answers he can check and agreeing to move forward or to a specific next step"),
]


def q(prompt, options, correct, explanation, skill):
    return dict(prompt=prompt, qtype="single", options=options, correct=correct, explanation=explanation, skill=skill)


# ── New Setter, weeks 1–2: full draft lessons ─────────────────────────────────────────────────
WEEK1 = dict(number=1, title="Foundations", goal="Know who we are, how a door works, and get your first bills.", days=[
    dict(day=1, title="Welcome to Twelve",
         lesson=dict(title="Welcome to Twelve: how the next 60 days work", skills=["resilience"], module="core",
             summary="What Twelve is, what the 60-day plan asks of you, and how to use this app every day.",
             body="""Twelve stands for wholeness: a team where you grow as a rep **and** as a person.

## The deal
For the next 60 days you follow the plan, every day. Reps who do the work in this plan give themselves the best shot at a six-figure year. Skipping days is how people stall.

## Your daily non-negotiables
- **Learn:** finish the day's lesson and quiz before you knock.
- **Practice:** run at least one role play. Reps who practice on the AI homeowner sound better on real doors.
- **Do:** hit the field number for the day and log it honestly.
- **Review:** upload one real conversation a week and read your coaching.

## How the app works
- **Today** shows exactly what to do.
- **Track** shows the whole 60 days and what unlocks next.
- **Practice** is where you talk to an AI homeowner.
- **Recordings** is where you upload real conversations (with the homeowner's OK) and get coaching.

Your leader and Chase can see your progress. That's not to watch you. It's so they can help you faster."""),
         quiz=[q("What unlocks each new week of the plan?", ["Time passing", "Passing the weekly assessment", "Your leader's approval", "Closing a deal"], 1,
                 "Each week ends with an assessment. Pass it and the next week opens.", "resilience"),
               q("What should you finish before knocking each day?", ["Nothing, just go", "The day's lesson and quiz", "A full role play hour", "Your recordings"], 1,
                 "Learn first, then go apply it on doors the same day.", "resilience"),
               q("Before you upload a real conversation you must…", ["Edit out the homeowner", "Have the homeowner's OK to record", "Get your closer's approval", "Wait 24 hours"], 1,
                 "California requires everyone's consent to record. No consent, no upload.", "honesty")],
         reflection=dict(title="Why are you here?", prompts=["Why did you join Twelve?", "What would a six-figure year change for you or your family?"]),
         field=dict(title="Shadow a full shift", instructions="Shadow your field trainer for a full shift. Watch, don't pitch. Log how many doors they knocked, conversations they had and bills they got.")),
    dict(day=2, title="Solar 101 for setters",
         lesson=dict(title="Solar 101: what we offer and what a setter does", skills=["honesty", "qualifying"], module="core",
             summary="Why homeowners go solar, the setter's job, and the honesty rules that never bend.",
             body="""## Why homeowners look at solar
- Their electric bill keeps climbing and they feel they have no control.
- They want protection from future rate increases.
- Some want backup power when the grid goes down.

You don't need to be an engineer. You need to find homeowners who are frustrated with their bill and get them a real conversation with a closer.

## Your job as a setter
1. Earn a few minutes of attention.
2. Find out if they qualify (homeowner, decent bill, decision makers).
3. Get the bill.
4. Set a firm appointment with **both** decision makers.

## Honesty rules (never bend)
- Say clearly who you are and who you work with. **Never** say or imply you're from the utility or the city.
- **Never** promise a specific savings number. The closer runs real numbers.
- **Never** say solar is "free."
- If someone says no clearly, thank them and leave.

These rules protect the homeowner, the team and your income. A deal won with a lie cancels."""),
         quiz=[q("A homeowner asks, 'Are you with Southern California Edison?' You say…", ["'Kind of, we work with them.'", "'Yes.'", "'No. I'm with Twelve, working with Sunrun.'", "Change the subject"], 2,
                 "Never imply you're the utility. Say who you are, plainly.", "honesty"),
               q("Who should be at the appointment?", ["Whoever is home", "Both decision makers", "Just the person you met", "Their kids"], 1,
                 "Appointments without both decision makers rarely close.", "setting"),
               q("A homeowner asks how much they'll save. You…", ["Promise 50%", "Say 'it's free'", "Explain the closer will run real numbers from their bill", "Guess"], 2,
                 "Setters don't quote savings. The closer runs real numbers.", "honesty")],
         field=dict(title="Knock 30 doors with your trainer", instructions="Knock 30 doors alongside your trainer. Take at least 5 doors yourself. Log doors, conversations, bills and appointments.")),
    dict(day=3, title="Anatomy of a door",
         lesson=dict(title="Anatomy of a door: the five parts", skills=["approach", "pattern-interrupt"], module="core",
             summary="The structure every good door follows, from the knock to the ask.",
             body="""## Before the door opens
Knock, then take a step back. Stand at an angle, hands visible, smile. Nobody wants a stranger in their doorway.

## The five parts
1. **Intro:** your name and who you're with, in one breath.
2. **Reason:** why you're on *their* street today ("We're helping a few neighbors on Oak with their summer bills").
3. **Interrupt:** a real question that makes them think instead of saying no on reflex. ("Have your bills been climbing like everyone else's this year?")
4. **Hook:** one honest reason it's worth two minutes.
5. **Ask:** the bill, or a time to come back when both decision makers are home.

## What kills doors
- Talking for 60 seconds before asking a question.
- Standing too close.
- Sounding like a script.

Practice the five parts out loud until they sound like you."""),
         quiz=[q("Right after knocking you should…", ["Lean on the doorframe", "Take a step back and smile", "Start talking through the door", "Knock again"], 1,
                 "Space and an open stance make you less threatening.", "approach"),
               q("The 'interrupt' part of the door is…", ["A long pitch", "A real question that makes them think", "A joke", "Handing them a flyer"], 1,
                 "A genuine question breaks the reflex 'no'.", "pattern-interrupt"),
               q("How long should you talk before asking your first question?", ["About a minute", "As long as it takes", "A few seconds", "Never ask questions"], 2,
                 "Get to a question fast. Monologues get doors closed.", "approach")],
         roleplay="busy-brenda",
         field=dict(title="Knock 40 doors", instructions="Knock 40 doors. Run all five parts on every door you can. Log doors, conversations, bills and appointments.")),
    dict(day=4, title="Tonality and reading people",
         lesson=dict(title="Tonality and reading the homeowner", skills=["tonality"], module="core",
             summary="How you sound matters more than what you say. Read the signals and adjust.",
             body="""## Sound certain, not pushy
- **Downward inflection:** statements end down, not up. "I'm Jake, with Twelve." Not "I'm Jake? With Twelve?"
- **Pace:** slower than you think. Nervous reps rush.
- **Volume:** match theirs. Loud homeowner, a little more energy. Quiet one, bring it down.

## Read the door
- Door half closed, body behind it: keep it short, go straight to your question.
- Kids or dinner in the background: acknowledge it ("Sounds like I caught you at dinner") and offer to be quick or come back.
- Arms crossed but still talking: they're listening. Ask a question.

## When to leave
If they've said a clear no twice, thank them and go. You'll be on that street again, and neighbors talk."""),
         quiz=[q("Downward inflection means…", ["Ending sentences like questions", "Ending statements on a lower note", "Talking quietly", "Talking fast"], 1,
                 "Statements that go down sound certain.", "tonality"),
               q("You hear dinner noise behind the homeowner. Best move?", ["Ignore it", "Acknowledge it and offer to be quick or come back", "Talk louder", "Leave without a word"], 1,
                 "Acknowledging their situation earns trust.", "tonality"),
               q("A homeowner says a clear no twice. You…", ["Push a third time", "Thank them and leave", "Argue", "Ask for a neighbor's number"], 1,
                 "Respect a clear no. Neighbors notice how you treat people.", "honesty")],
         field=dict(title="Knock 40 doors and note reactions", instructions="Knock 40 doors. Write down three homeowner reactions and how you adjusted your tone. Log your numbers.")),
    dict(day=5, title="Getting the bill",
         lesson=dict(title="Getting the bill", skills=["bill-ask"], module="core",
             summary="Why the bill matters and how to ask so it feels easy.",
             body="""## Why the bill
The bill shows usage and cost, which tells the closer whether solar makes sense. No bill, no real numbers.

## How to ask
1. **Give the reason:** "So we can see if this even makes sense for you, the easiest thing is to look at your last bill."
2. **Make it easy:** "Most people just pull it up on the Edison app. Mind if I snap a photo?"
3. **Stay quiet** and let them find it.

## "I don't have it handy"
- Offer the app: most utilities have one.
- Or set the appointment and ask them to have it ready.
- Never pressure. If they don't want to share, that's an answer."""),
         quiz=[q("Why do we ask for the bill?", ["To sell their data", "It shows usage and cost so the numbers are real", "It's required by law", "To find their account number"], 1,
                 "Real numbers start with the real bill.", "bill-ask"),
               q("After asking for the bill you should…", ["Keep talking", "Stay quiet and let them find it", "Ask again immediately", "Walk away"], 1,
                 "Silence gives them space to act.", "bill-ask"),
               q("'I don't have it handy.' A good reply is…", ["'Then never mind.'", "'Most people pull it up on the utility app. Want to check?'", "'I'll wait here all day.'", "'Guess the amount.'"], 1,
                 "Offer the easiest path, without pressure.", "bill-ask")],
         field=dict(title="Get 2 bills", instructions="Knock 40+ doors with a goal of 2 bills. Log doors, conversations, bills and appointments.")),
    dict(day=6, title="Your first smoke screens",
         lesson=dict(title="Smoke screens: acknowledge, question, redirect", skills=["objection-handling"], module="core",
             summary="Most early no's are reflexes, not decisions. One simple framework handles them.",
             body="""## Smoke screen vs. real objection
A **smoke screen** is a reflex ("not interested", "I'm busy"). A **real objection** is a reason ("I'm renting", "We're moving next month").

## Acknowledge, question, redirect (AQR)
1. **Acknowledge:** agree with something true. "Totally fair, nobody's interested in a stranger at the door."
2. **Question:** one curious question. "Out of curiosity, have your summer bills been going up?"
3. **Redirect:** one honest reason to keep talking, then your ask.

## Real objections
- **Renting:** they don't qualify. Thank them, ask if the owner lives nearby, move on.
- **Moving soon:** thank them and move on.

One honest attempt per objection. Then respect the answer."""),
         quiz=[q("'I'm not interested' is usually…", ["A final decision", "A reflex smoke screen", "A request for a discount", "Rude"], 1,
                 "Most early no's are reflexes. Acknowledge and ask one question.", "objection-handling"),
               q("The first step of AQR is…", ["Argue", "Acknowledge something true", "Pitch harder", "Leave"], 1,
                 "Agreeing first lowers their guard.", "objection-handling"),
               q("A renter wants to hear more. You…", ["Set an appointment anyway", "Thank them and ask if the owner is nearby", "Pitch the landlord through them", "Ignore that they rent"], 1,
                 "Renters don't qualify. Be gracious and move on.", "qualifying")],
         roleplay="diane-spouse",
         field=dict(title="Knock 50 doors, use AQR", instructions="Knock 50 doors and use AQR on every smoke screen. Log your numbers and the smoke screens you heard most.")),
    dict(day=7, title="Week 1 review and assessment", review=True,
         reflection=dict(title="Week 1 look back", prompts=["What went better than you expected this week?", "What's the one skill you most need to improve next week?"]),
         field=dict(title="Knock 40 doors", instructions="Knock 40 doors using everything from this week. Log your numbers.")),
])

WEEK1["assessment"] = [
    q("Which of these is never OK to say at the door?", ["'I'm with Twelve.'", "'We're with your utility company.'", "'Have your bills gone up?'", "'Mind if I look at your bill?'"], 1,
      "Never imply you're the utility.", "honesty"),
    q("The five parts of a door, in order:", ["Ask, hook, intro, reason, interrupt", "Intro, reason, interrupt, hook, ask", "Hook, ask, intro, interrupt, reason", "Reason, intro, ask, hook, interrupt"], 1,
      "Intro, reason, interrupt, hook, ask.", "approach"),
    q("Why do we want both decision makers at the appointment?", ["It's a legal requirement", "Appointments with one decision maker rarely close", "Closers prefer crowds", "It's faster"], 1,
      "One decision maker usually means 'I need to talk to my spouse.'", "setting"),
    q("A smoke screen is…", ["A real reason they can't go solar", "A reflex response like 'not interested'", "A signed contract", "A bad roof"], 1,
      "Smoke screens are reflexes, not decisions.", "objection-handling"),
    q("Good tonality at the door sounds…", ["Fast and excited", "Calm and certain, ending statements down", "Like a question", "Very loud"], 1,
      "Calm, certain, downward inflection.", "tonality"),
    q("What should you do before uploading a real conversation?", ["Nothing", "Make sure the homeowner agreed to be recorded", "Delete the first minute", "Ask your closer"], 1,
      "Everyone in the conversation must agree to be recorded.", "honesty"),
]

WEEK2 = dict(number=2, title="Doors that set", goal="Turn conversations into firm appointments with both decision makers.", days=[
    dict(day=8, title="Pattern interrupts that work",
         lesson=dict(title="Pattern interrupts that work (honestly)", skills=["pattern-interrupt"], module="core",
             summary="How to break the reflex 'no' without gimmicks.",
             body="""## Why interrupts work
Homeowners have a script for salespeople: "Not interested, thanks." A good interrupt makes them think, so they leave the script.

## Interrupts that work
- **Specific to their street:** "A few of your neighbors on Maple asked us about their summer bills."
- **About them:** "Did your bill jump this summer like everyone else's?"
- **Honest curiosity:** "Can I ask you something quick? What's your bill running in July?"

## What not to do
- Fake urgency ("only today").
- Pretending to be an inspector, the city or the utility.
- Tricks that make people feel stupid later. They cancel."""),
         quiz=[q("A good pattern interrupt is…", ["A fake deadline", "A real question about their situation", "Pretending to be an inspector", "A long pitch"], 1,
                 "Honest questions break the script.", "pattern-interrupt"),
               q("Why avoid gimmicks?", ["They're too slow", "People who feel tricked cancel", "Closers hate them", "They're expensive"], 1,
                 "A deal won with a trick cancels.", "honesty"),
               q("Which opener references their street honestly?", ["'The city sent me.'", "'A few neighbors on Maple asked about their bills.'", "'Your power is being shut off.'", "'You've been selected.'"], 1,
                 "Specific and true beats dramatic and false.", "pattern-interrupt")],
         roleplay="busy-brenda",
         field=dict(title="Knock 50 doors", instructions="Knock 50 doors. Try three different interrupts and note which got the most conversations.")),
    dict(day=9, title="Qualifying fast",
         lesson=dict(title="Qualifying fast and politely", skills=["qualifying"], module="core",
             summary="Find out in under a minute whether this home is a fit.",
             body="""## The basics
- **Homeowner?**
- **Who makes decisions** about the house and bills?
- **Bill size:** roughly what it runs in summer.
- **Roof and shade:** any obvious issues (heavy tree cover, very old roof).
- **Timing:** planning to move soon?

## Ask naturally
Weave questions into the conversation. "Is it just you two here, or is someone else involved in the bills?"

## Disqualify gracefully
Not a fit? Thank them, ask if a neighbor might be, and move on. Your time is your income."""),
         quiz=[q("Which is NOT a basic qualifying question?", ["Are you the homeowner?", "Who handles the bills?", "What's your favorite sports team?", "What does your summer bill run?"], 2,
                 "Stick to homeowner, decision makers, bill, roof, timing.", "qualifying"),
               q("A homeowner is moving next month. You…", ["Set the appointment anyway", "Thank them and move on", "Argue they should stay", "Ask for the new address"], 1,
                 "Moving soon means not a fit right now.", "qualifying"),
               q("Why qualify early?", ["To be rude", "Your time is your income", "It's required", "Closers ask you to"], 1,
                 "Spend time on homes that can go solar.", "qualifying")],
         field=dict(title="Knock 50 doors, qualify every conversation", instructions="Knock 50 doors. For every conversation, note whether they qualified and why.")),
    dict(day=10, title="Both decision makers",
         lesson=dict(title="Getting both decision makers", skills=["setting"], module="core",
             summary="The single biggest cause of no-close appointments, and how to avoid it.",
             body="""## Why it matters
If one spouse isn't at the appointment, the answer is almost always "I need to talk to my husband/wife." The closer can't close a person who isn't there.

## How to ask
- "Who besides you looks at the bills?"
- "When are you both usually home? Evenings or weekends?"

## Locking it in
Offer two specific times when both are home. Confirm both names. Send the confirmation text (with their OK)."""),
         quiz=[q("One spouse says 'my husband handles the bills.' You…", ["Pitch her anyway", "Find a time when both are home", "Leave", "Ask her to sign"], 1,
                 "Set the appointment for when both are there.", "setting"),
               q("Best way to set the time?", ["'Whenever works'", "Offer two specific times when both are home", "Pick a time for them", "Let the closer call later"], 1,
                 "Two specific options make it easy to say yes.", "setting"),
               q("Why do appointments with one decision maker fail?", ["The closer is late", "'I need to talk to my spouse'", "Pricing changes", "The roof"], 1,
                 "The missing spouse becomes the objection.", "setting")],
         roleplay="diane-spouse",
         field=dict(title="Set 1 appointment with both decision makers", instructions="Knock 50+ doors with a goal of one appointment with both decision makers confirmed.")),
    dict(day=11, title="Setting a firm appointment",
         lesson=dict(title="Setting appointments that actually sit", skills=["setting", "honesty"], module="core",
             summary="Half of appointments don't sit today. Here's how to make yours stick.",
             body="""## A firm appointment has
- A **specific** day and time, with both decision makers.
- Confirmed address and phone number.
- Clear expectations: "My closer will sit down with you both for about an hour and go through real numbers from your bill."

## Texting consent
Ask: "Are you OK if we text you a reminder about this appointment and follow-ups?" Only tap the consent button if they say yes.

## Before you leave
- Repeat the time back.
- Tell them what to have ready (the bill).
- Thank them by name."""),
         quiz=[q("Before sending appointment texts you must…", ["Nothing", "Get the homeowner's OK to text them", "Ask your closer", "Text their neighbors"], 1,
                 "Texting needs the homeowner's consent.", "honesty"),
               q("A firm appointment includes…", ["'Sometime next week'", "A specific day and time with both decision makers", "Only a phone number", "A promise of savings"], 1,
                 "Specific time, both decision makers, confirmed details.", "setting"),
               q("Why set expectations about the appointment?", ["To scare them", "People show up when they know what to expect", "It's a legal script", "To fill time"], 1,
                 "Clear expectations raise show rates.", "setting")],
         field=dict(title="Set 1 firm appointment", instructions="Knock 50+ doors. Set at least one firm appointment and confirm texting consent. Log your numbers.")),
    dict(day=12, title="Handling 'not interested'",
         lesson=dict(title="Handling 'not interested'", skills=["objection-handling", "resilience"], module="core",
             summary="The most common door answer, and the one honest way through it.",
             body="""## What it usually means
"I don't know you, and I'm busy." It's rarely about solar.

## One honest attempt
- **Acknowledge:** "Totally fair, I wouldn't be interested in a stranger at my door either."
- **Question:** "Can I ask, have your bills been going up?"
- If yes, redirect to the bill or a time. If no or still not interested: "No worries, have a great night."

## Your mindset
You'll hear this most of the day. Every polite exit protects your reputation on the street. Next door."""),
         quiz=[q("How many honest attempts after 'not interested'?", ["None", "One", "Three", "Until they agree"], 1,
                 "One honest attempt, then respect the answer.", "objection-handling"),
               q("'Not interested' usually means…", ["They hate solar", "They don't know you and they're busy", "They already have solar", "Come back tomorrow"], 1,
                 "It's usually about you being a stranger, not about solar.", "objection-handling"),
               q("After a firm second no, you…", ["Argue", "Say 'No worries, have a great night' and leave", "Leave a note on their car", "Knock again later"], 1,
                 "Polite exits protect your reputation.", "resilience")],
         roleplay="busy-brenda",
         field=dict(title="Knock 60 doors", instructions="Knock 60 doors. Count how many 'not interested' became conversations.")),
    dict(day=13, title="Handling 'solar is a scam'",
         lesson=dict(title="'Solar is a scam' and 'we already looked into it'", skills=["objection-handling", "honesty"], module="core",
             summary="Skeptics usually have a story. Hear it first.",
             body="""## Start with empathy
"I hear that a lot, and honestly some people have had bad experiences." Then ask: "What happened?"

## Separate their story from today
Listen fully. Then: "That's exactly why we look at your real bill and real numbers before anyone decides anything. If it doesn't make sense, we'll tell you."

## Never
- Trash another company by name.
- Promise it'll be different without showing why.

## 'We already looked into it'
"What did you find?" Their answer tells you whether it's a timing issue, a numbers issue or a trust issue."""),
         quiz=[q("A homeowner says solar is a scam. First you…", ["Argue the facts", "Acknowledge and ask what happened", "Trash the other company", "Leave"], 1,
                 "Hear their story before anything else.", "objection-handling"),
               q("Talking about another solar company, you should…", ["Trash them by name", "Never trash them", "Say they're a scam", "Ask for their contract"], 1,
                 "Running others down makes you look worse.", "honesty"),
               q("'We already looked into it.' Best reply?", ["'You looked wrong.'", "'What did you find?'", "'That was the old program.'", "'Okay, bye.'"], 1,
                 "Their answer tells you what the real issue is.", "objection-handling")],
         roleplay="skeptic-steve",
         field=dict(title="Knock 60 doors", instructions="Knock 60 doors. Note every skeptic you met and what their story was.")),
    dict(day=14, title="Week 2 review and assessment", review=True,
         reflection=dict(title="Week 2 look back", prompts=["How many appointments did you set this week, and how many had both decision makers?", "Which objection still throws you off?"]),
         field=dict(title="Knock 50 doors", instructions="Knock 50 doors using everything from weeks 1 and 2. Log your numbers.")),
])

WEEK2["assessment"] = [
    q("Best pattern interrupt?", ["'The city sent me.'", "'Did your bill jump this summer like everyone else's?'", "'Today only!'", "'You've won a prize.'"], 1,
      "An honest question about them.", "pattern-interrupt"),
    q("Which homeowner qualifies?", ["Renter in an apartment", "Homeowner with a $300 summer bill staying put", "Owner moving next month", "Owner who said no twice"], 1,
      "Homeowner, real bill, staying put.", "qualifying"),
    q("An appointment is firm when…", ["You left a flyer", "Both decision makers, a specific time, confirmed details", "They said 'maybe'", "You have their email"], 1,
      "Specific, both decision makers, confirmed.", "setting"),
    q("Before texting appointment reminders you…", ["Text anyway", "Get their OK and tap the consent button", "Ask the closer", "Use a different number"], 1,
      "Texting requires their consent.", "honesty"),
    q("'Solar is a scam.' The right first move:", ["Argue", "Acknowledge and ask what happened", "Leave immediately", "Promise huge savings"], 1,
      "Empathy first, then their story.", "objection-handling"),
    q("After a clear second no you…", ["Push harder", "Thank them and leave", "Come back in an hour", "Talk to their neighbor about them"], 1,
      "Respect the answer; neighbors are watching.", "resilience"),
]

# ── New Setter weeks 3–9: outline only (titles), to be recorded by Chase ─────────────────────
OUTLINE_WEEKS = [
    (3, "Volume and consistency", "Build a daily plan you can hit every day.",
     ["Building your daily door plan", "Tracking your numbers", "Energy on long days", "Mapping a neighborhood", "Callbacks and second knocks", "Working with your closer"]),
    (4, "Show rates and handoffs", "Make every appointment you set actually sit.",
     ["Confirming appointments", "The handoff to your closer", "Reschedules done right", "Following up no-shows", "Reading the bill like a pro", "Common qualifying mistakes"]),
    (5, "Objection mastery", "Handle the objections that cost the most appointments.",
     ["'It's expensive'", "'I need to talk to my spouse'", "'We might move'", "Roof and shade questions", "Credit worries (route to your closer)", "Stacked objections"]),
    (6, "Self-gen fundamentals", "Learn what happens at the table so you can run your own deals.",
     ["What self-gen means", "Presentation basics", "Building value", "Earning trust at the table", "Next steps and paperwork basics", "Learning from your closer's recordings"]),
    (7, "Referrals and neighborhoods", "Turn every customer and neighbor into more conversations.",
     ["Asking for referrals", "Neighbor stories, honestly", "Becoming known on a street", "Social media basics for reps", "Recruiting your first teammate", "Helping a new rep"]),
    (8, "Mindset and leadership", "Stay steady, manage your money and lead by example.",
     ["Handling rejection", "Resetting after a bad day", "Setting and reviewing goals", "Money management on commission", "Twelve's values and standards", "Leading by example"]),
    (9, "Your six-figure plan", "Lock in the habits and plan your next 90 days.",
     ["Your 90-day plan", "Review your numbers with your leader", "Graduation role play"]),
]

# Other tracks: week 1 structure only (stubs) so the admin can assign them.
OTHER_TRACKS = [
    dict(slug="experienced-setter", name="Experienced Setter", rep_type="setter",
         description="For setters who already knock: sharpen the skills that raise appointments and show rates.",
         week1=("Level up", "Find your weakest numbers and fix them first.",
                ["Diagnose your numbers", "Advanced pattern interrupts", "Owning the bill ask", "Two-decision-maker mastery",
                 "Raising show rates", "Getting ready for self-gen", "Week 1 check-in"])),
    dict(slug="closer", name="Closer", rep_type="closer",
         description="The Twelve table process from discovery to signature.",
         week1=("The Twelve table", "Run the table process the same way every time.",
                ["The Twelve table process", "Discovery that finds the real why", "Building value before numbers",
                 "Presenting numbers with confidence", "'We need to think about it'", "Closing and next steps", "Week 1 check-in"])),
]
