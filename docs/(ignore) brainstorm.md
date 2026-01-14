I have an idea for a micro-app I want to build.  I want to build a simple interface for interacting with my Cursor and Claude Code experiences via my iphone.  I want this experience to be free if possible, or as low-cost and low-maintenance as possible.  I don't particularly care about how the UI/UX is represented (it could be something that's as simple as exposing it via Slack or something like that).  I do however want to be able to interact via both voice, and via text.  This is primarily for personal use, however I will likely eventually want a secure way to use this for work purposes as well so in the future I might want to be able to connect this to Okta-managed work accounts and Github repos (completely segregated from personal use aside from the UI -- there's a world where it might be ok to just do this in a separate app that we clone).  I want this to support copy/paste.  I want to be able to direct the agent to the right project or repo (which might happen automatically?).  I want to be able to visualize any agent conversation I've been having with either Cursor or Claude Code.  I want to be able to check the changes that have been made by the agent to my code.  I want the app to notify me when an agent is done with a task and ready for review.  I want to be able to stop an agent in flight.  I want voice input to only "send" to the agent when I push a send button. I want this experience to be something I can link or navigate to from a future "super app" I'm going to build which will house a variety of personal productivity tools and apps I've created.  I want this to be secure at least enough for general privacy.  Help me flesh this out further.Show more5:39 PMThis is a really interesting idea! Let me start by making sure I understand the core problem you're trying to solve, because that'll shape a lot of decisions.
The "why" question first:
It sounds like you want to monitor and interact with coding agents (Cursor, Claude Code) when you're away from your computer. Is that right?
A few scenarios I'm imagining:

You kick off a task on your laptop, walk away, and want to check progress/give feedback from your phone
You have an idea while mobile and want to start a task remotely
You want to review what an agent did before you get back to your desk

Which of these resonates most? Or is it something else entirely?
Some early clarifying questions:

Where are Cursor and Claude Code running? On your local machine? In a cloud dev environment? This matters a lot because if they're on your laptop and your laptop goes to sleep, there's nothing to connect to.
When you say "visualize any agent conversation" — do you mean see the full history of what you and the agent discussed, or do you mean watch it in real-time as it's working?
On the "direct the agent to the right project" piece — are you typically working on multiple projects simultaneously, or is this more about starting fresh sessions on different repos?
What's your current workflow? Do you already use Cursor and Claude Code regularly? How do you currently handle the "waiting for the agent" problem — do you just sit and watch, or do you context-switch and forget to come back?

Let's nail down the core use case before we get into implementation options, because I have a hunch there might be some simpler paths than building a full custom app — but it depends on what you actually need.Those "why"s are all correct.  By the way I also want to be able to have the agent follow some general rules like being able to (similar to Cursor) specifically tag files or skills for reference, and I should have some "default" action types that follow specific prompting templates that I've created, and I want all new projects to follow the same overall template structure for the repo.  To answer your questions:
1. They're running on my local machine but I think they run on the cloud by default right?  I wasn't aware the machine going to sleep would impact anything?
2. Much more important is checking the agent conversation history, however it'd be nice to be able to watch it in real-time to keep track and make sure it's not going off the rails.  Maybe we just do it more like slightly-less-than-real-time?  
3. I often have multiple projects going at once, so I just want to make sure the agent doesn't accidentally make an update to the wrong app or doc, etc. 
4. Somewhat regularly, although I'm fairly new.  Today I sit and wait for the agent to finish a task and usually come back, check it, and hit "next task" over and over.  I like to get up and walk around while it's running, hence the need for this app.Show more5:44 PMThis is really helpful context. Let me address a critical misconception first, then dig into the new features you mentioned.
The local machine issue is actually a big deal:
When you run Cursor or Claude Code on your laptop, the interface and file operations happen locally. The AI model calls go to the cloud, but the agent itself — the thing reading your files, making edits, running commands — that's all happening on your machine. If your laptop sleeps or you close the lid, the agent stops. It's not like a cloud build that keeps running.
This fundamentally shapes your architecture options:

Option A: Keep your laptop awake/open, and build something that just lets you view and interact with what's happening there remotely
Option B: Move your dev environment to the cloud (like a remote server, GitHub Codespaces, or similar) so it runs independently of your laptop
Option C: Some hybrid where you can at least start tasks remotely and your machine wakes up

Which of these fits how you actually want to work? Do you want to be able to walk away with your laptop closed, or is "laptop open on desk, I'm walking around the house/office" the real scenario?
On the new features you mentioned:
You're describing a layer of workflow automation on top of the agents:

Tagging files/skills for reference
Default action types with prompt templates
Standard repo templates for new projects

This is interesting but it's a meaningful expansion of scope. Before we go there, I want to ask: Are these things you wish Cursor/Claude Code did better, or are these things you've already built workflows for and want to preserve?
Because if it's the former, we should validate whether the mobile app is really the right place to solve that, or whether that's a separate "dev workflow config" project.on the local thing -- honestly I don't have a strong preference.  I'd ideally in the future like to be able to be fully async so I can have an idea on a walk and trigger it kicking off.  However, I want to optimize for relatively cheap hosting stuff, so if there's a way to do that without needing to like set up a complex or expensive remote server I'd prioritize that.  So Option C kind of seems like the best move?  You tell me. On the features -- why is that a big scope expansion?  We're just loading some basic templates for the prompts, and we're just supporting file tagging similar to what Cursor already does.  Like today what I do in Cursor is I include in my repo a few prompt templates and say something like "Follow the process in @new-feature-template then plan the next new feature in my features list from @product-requirements-doc".5:49 PMAh okay, that reframes things significantly. Let me tackle both points.
On the templates/tagging:
You're right, I was overcomplicating it. If you're already doing this via @ references in Cursor, then you're not asking for new functionality — you just want to be able to type that same kind of prompt from your phone and have it work. The templates live in your repo already. That's much simpler than what I was imagining (some separate config system).
Quick clarification though: when you're on your phone and you say "follow @new-feature-template", how does the agent know which repo that file lives in? Is it:

You're always continuing an existing session that's already pointed at a repo, or
You need to specify "in project X, do this", or
You have some "default" project it should assume?

On the hosting/async question:
Let me be honest about the tradeoffs here because "cheap" and "fully async from anywhere" are in tension:
ApproachCan you close laptop?CostComplexityLaptop stays open, you remote inNoFreeLowAlways-on cloud VMYes$5-20/mo minimumMediumWake-on-LAN + laptopSort of (finicky)FreeHigh/unreliableServerless trigger → spins up environmentYesPay-per-use, potentially cheapHigh to set up
My honest take: For an MVP, I'd start with "laptop open on desk" and just solve the remote viewing/interaction problem first. Get that working. Then if the async-from-anywhere thing is still important, tackle the hosting piece as a v2 concern.
Does that sequencing make sense, or is the "idea on a walk, trigger it" scenario so core that we need to solve it from day one?I should always be in a repo - when I open a session I should land in the same repo I was in last time but have the ability to switch projects too.  Explain the serverless trigger thing more and the implications.6:10 PMOn the repo default: That makes sense. So it's basically "remember my last active project" as the default, with a project switcher. Simple enough.
On serverless triggers:
The idea is: instead of paying for a server that's running 24/7 waiting for you to maybe send a command, you pay only when something actually happens.
Here's how it would conceptually work:

You send a message from your phone (say via a simple web app or Slack)
That triggers a serverless function (like AWS Lambda, Google Cloud Functions, or Cloudflare Workers)
That function spins up a temporary cloud dev environment (like a GitHub Codespace or a container)
The environment clones your repo, runs Claude Code or a similar agent, does the task
When done, it notifies you, saves the changes (commits/pushes or stores a diff), and shuts down

Why this is appealing:

You only pay for actual compute time (could be pennies per task if tasks are short)
Fully async — your laptop can be off, you can be anywhere
Scales to zero when you're not using it

Why this is complicated:
The hard part isn't the serverless function itself — that's easy. The hard parts are:

Cursor doesn't work this way. Cursor is a desktop app. You can't just "run Cursor in a container." Claude Code is CLI-based and could work in this model, but you'd be giving up Cursor entirely for this flow.
Environment setup time. Spinning up a container, cloning your repo, installing dependencies — that could take 30 seconds to a few minutes before the agent even starts. Is that acceptable latency for "idea on a walk"?
State management. Your local Cursor session has context — conversation history, open files, what you were just working on. A fresh serverless environment doesn't know any of that. You'd need to persist and reload that state somehow.
Secrets and credentials. Your local machine has your SSH keys, API tokens, environment variables. A cloud environment needs those too, securely.

The real question:
How important is Cursor specifically versus Claude Code? Because Claude Code being CLI-based makes the serverless path way more feasible. Cursor being a GUI app basically requires a persistent machine somewhere.Yeah lets just go with the laptop open thing and save the idea of serverless trigger for later6:12 PMSmart. That simplifies things a lot for MVP.
So now we're talking about: a mobile interface that connects to Cursor/Claude Code sessions running on your laptop at home.
Let me make sure I understand the core interaction model:

You're at your laptop, working in Cursor or Claude Code on a project
You walk away (laptop stays open)
From your phone, you can:

See what the agent is doing / has done
Send new prompts (voice or text)
Get notified when it's waiting for you
Stop it if it's going off the rails
Review the code changes it made



The big architectural question now is: how does your phone talk to your laptop?
A few options:
ApproachHow it worksProsConsDirect connection (like Tailscale)Your phone and laptop on a private network, phone hits a local server on laptopSimple, free, secureNeed to set up Tailscale or similarCloud relay (like a simple Firebase/Supabase backend)Laptop pushes state to cloud, phone reads from cloud, commands go back through cloudWorks through any network/firewallSmall hosting cost, slight latency, more moving partsPiggyback on existing service (Slack, Discord, Telegram bot)Laptop runs a bot that posts updates and receives commandsMinimal app building, notifications freeLess control over UX, dependent on third party
You mentioned Slack as a possibility early on and said you don't care much about UI/UX polish. Are you leaning toward the "just make it a Slack bot" approach, or do you want something more standalone?Explain the tradeoffs more... Like I'd really like some UX control for some of the stuff like quick-selecting prompts for common actions, toggling between projects, etc.  But, something like Slack or Telegram seem really easy to start with and cut down the build.6:15 PMYeah, this is a real tension. Let me break it down more concretely.
What you get "for free" with Slack/Telegram:

Push notifications (huge — building this yourself is annoying)
Text input that just works
Voice messages (though you'd need to transcribe them somehow)
Copy/paste
Message history/scrollback
Mobile app already exists
Authentication already handled

What's awkward or hard in Slack/Telegram:

Quick-select prompts: You could do this with Slack's button/menu attachments, but it's clunky. You get like a dropdown or a row of buttons, not a nice custom UI. Telegram has inline keyboards which are slightly better but still limited.
Project switching: You'd probably do this as a slash command like /project my-app-name or buttons. Workable but not slick.
Viewing code diffs: Slack's code formatting is okay for small snippets, but reviewing real diffs is painful. You'd probably end up linking out to something else (a web view, GitHub, etc.)
Real-time streaming: Slack isn't built for "watch the agent type." You'd be posting periodic updates or editing a message repeatedly, which is janky.
The "stop" button: Doable with a button attachment on messages, but there's latency — not instant like a native UI.

The hybrid option:
What some people do is use Slack/Telegram as the notification and quick interaction layer, but link out to a simple web UI for anything richer. So:

Slack bot posts: "✅ Task complete in my-app. 3 files changed." with buttons: [View Diff] [New Prompt] [Switch Project]
"View Diff" opens a simple web page showing the changes
"New Prompt" either opens a thread for typing or links to a web form with your quick-select templates

This gets you the free notifications and basic interaction while letting you build just the parts that need custom UX.
Does that hybrid approach appeal to you, or do you want to gut-check whether the Slack limitations are actually dealbreakers first?Hybrid sounds pretty good, seems like we wouldn't need a full app in that case.  But if we do that, how does the webpage get hosted/etc.?  Like I can't view that from my localhost right?6:18 PMRight, exactly. If the webpage is served from your laptop's localhost, you can't hit it from your phone over the regular internet.
But remember Tailscale from earlier? This is where it comes back.
Tailscale creates a private encrypted network between your devices. Once set up:

Your laptop gets a stable IP like 100.x.x.x or a magic DNS name like my-macbook.tailnet-name.ts.net
Your phone (with Tailscale app installed) can access that address from anywhere
It punches through firewalls, works on cellular, etc.

So the setup would be:

Laptop runs a simple local web server (could just be a tiny Node/Python thing)
That server shows your diff viewer, prompt templates, project switcher
Tailscale makes that server reachable from your phone
Slack/Telegram handles notifications and links to http://my-macbook.tailnet-name.ts.net:3000/diff/latest or whatever

Cost: Tailscale is free for personal use (up to 100 devices).
Complexity: You install the Tailscale app on your laptop and phone, sign in with Google/GitHub, and you're basically done. It's shockingly easy compared to setting up VPNs or port forwarding.
The one caveat:
If your laptop goes to sleep or loses internet, the web UI becomes unreachable. But we already accepted that constraint.

Does this architecture make sense so far? If so, I want to step back and ask a different question: How does your laptop actually "know" what Cursor or Claude Code is doing? Because that's the piece we haven't addressed yet — and it might be the hardest part.Oh that seems easier, why don't we do tailscale by default?  I think the slackbot is still super helpful but I think a Tailscale-first approach would be good.  I don't want to get locked into those platforms and would like to be platform agnostic over time, and ideal world could publish freely to both Telegram or Slack, and also other platforms in the future like email.6:23 PMLove it. That's a cleaner architecture anyway — Tailscale + local web UI as the core, with Slack/Telegram/email as optional notification channels you can plug in.
So the architecture is shaping up as:
[Your Phone]
     |
     | (Tailscale private network)
     v
[Laptop running local server]
     |
     |-- Web UI (diffs, prompts, project switcher)
     |-- Notification dispatcher (sends to Slack, Telegram, email, whatever)
     |-- ??? connection to Cursor/Claude Code ???
Now the hard question I flagged earlier:
How does your local server actually know what Cursor or Claude Code is doing?
This is where it gets tricky because neither tool was really built to be "observed" by external software:
Cursor:

It's an Electron app (VS Code fork)
The agent conversation lives inside the app's UI
There's no official API or file that says "here's the current conversation" or "here's what files changed"
You might be able to scrape its internal state from logs or extension data, but it's fragile and could break with updates

Claude Code:

CLI-based, which is better
Conversations are logged to ~/.claude/ directory (I believe)
You could potentially tail those logs to see what's happening
Sending commands is trickier — you'd need to somehow inject input into a running CLI session, or start sessions programmatically

Honest question for you: Do you need to support both Cursor and Claude Code from day one? Or could MVP focus on just one — and if so, which do you use more?Claude Code by itself is fine out of the gate.  I want to be able to see what's happening in the conversation and the repo so that's a lot more important than whether it's Cursor's agent or Claude's.  We should assume we're supporting CLI primarily.  Also though doesn't Cursor have CLI options too?6:25 PMGood call focusing on Claude Code for MVP. And yes, you're right to push back on Cursor — let me clarify.
Cursor does have a CLI:
You can run cursor from the command line to open files/folders, similar to code for VS Code. But that's just launching the app — it's not the same as running the AI agent headlessly. The Cursor agent (Composer, the thing that edits files and has a conversation) still runs inside the GUI. There's no cursor-agent --prompt "build me a feature" that I'm aware of.
So even with the CLI, you'd still have the "how do I observe/control the agent" problem.
Claude Code is different:
It's genuinely CLI-native. You run it in a terminal, the conversation happens in that terminal, and it can run non-interactively. This makes it much more scriptable.

Let me validate my understanding of Claude Code's architecture:
Based on how it works:

Conversations get logged to ~/.claude/projects/ (organized by project directory)
You can run claude interactively, or potentially pipe input to it
It has flags like --continue to resume conversations, --print for non-interactive output

Things I'd want to verify before we commit to an approach:

Can you reliably "watch" a running Claude Code session's output in real-time from another process?
Can you send input to an already-running session, or do you have to start new sessions?
How does it track which files it changed?

Have you poked around in ~/.claude/ at all to see what's stored there? Or want me to walk you through what to look for?Your job to answer... YOu are Claude after all...6:26 PMHa! Fair point. Let me look into this properly.Claude Code CLI ~/.claude directory structure logs10 resultsCLI reference - Claude Code Docsclaude.comGitHub - daaain/claude-code-log: A Python CLI tool that converts Claude Code transcript JSONL files into readable HTML format.github.comWhat is Working Directory in Claude Code | ClaudeLogclaudelog.comClaude Code: Best practices for agentic codinganthropic.comUsing CLAUDE.MD files: Customizing Claude Code for your codebase | Claudeclaude.comShipyard | Claude Code CLI Cheatsheet: config, commands, prompts, + best practicesshipyard.buildThe .claude Folder: A 10-Minute Setup That Makes AI Code Smarter | by Manojkumar Vadivel | Mediummedium.comHow I Use Every Claude Code Feature - by Shrivu Shankarsshh.io.claude - Your Claude Code Directorydotclaude.comUnderstand configuration directories in Claude Code - M.academym.academyGood finds. Let me dig a bit deeper on the specific session log structure.Claude Code session JSONL format ~/.claude/projects transcript structure10 resultsGitHub - simonw/claude-code-transcripts: Tools for publishing transcripts for Claude Code sessionsgithub.comGitHub - daaain/claude-code-log: A Python CLI tool that converts Claude Code transcript JSONL files into readable HTML format.github.comGitHub - withLinda/claude-JSONL-browser: A web-based tool that converts Claude Code CLI conversation logs (JSONL format) into human-readable Markdown. Features a built-in file explorer for managing multiple logs at once.github.comAutomate Your AI Workflows with Claude Code Hooks | Butler's Loggitbutler.comclaude-JSONL-browser | Claude Code Resource - Claude Hubclaude-hub.comclaude-code-transcripts/README.md at main · simonw/claude-code-transcriptsgithub.comAnalyzing Claude Code Interaction Logs with DuckDB - Liam ERDliambx.comClaude Code `--continue` after Directory `mv` move - Migration Guide and Internal Mechanics explanation · GitHubgithub.comA new way to extract detailed transcripts from Claude Codesimonwillison.netHooks reference - Claude Code Docsclaude.comThis is great. I now have a clear picture. Let me summarize what I found:
Claude Code's architecture is actually very friendly for what you want to build:
Session storage:

All conversations are stored as JSONL files in ~/.claude/projects/
The folder structure is: ~/.claude/projects/[encoded-directory-path]/[session-uuid].jsonl
Each line in the JSONL is a discrete event (user message, assistant response, tool use, etc.)
This means you can tail these files in near-real-time to watch what's happening

What each JSONL entry contains:

type: "user" or "assistant"
message: the actual content
timestamp: when it happened
sessionId: which session this belongs to
cwd: the working directory (your project)
gitBranch: current branch
Tool usage details when Claude runs commands or edits files

Hooks system:
Claude Code has a hooks system that can fire scripts on events like:

PreToolUse / PostToolUse — before/after Claude uses a tool
Stop — when Claude finishes a task
UserPromptSubmit — when you send a prompt

This is huge for your use case. You could have a hook that fires when Claude stops, which triggers a notification to your phone.
Sending commands:

claude --continue resumes the last session
claude -p "your prompt" runs in headless/non-interactive mode
You can pipe input to it


So the architecture for MVP looks like:

Watch the JSONL files — a simple script tails ~/.claude/projects/*/ to show conversation history and near-real-time updates
Use hooks — set up a Stop hook that pings your local web server, which then sends a notification
Send commands — your web UI posts to a local API, which runs claude -p "your prompt" --continue or similar
Track file changes — either via git diff or by parsing the tool use events in the JSONL

Does this make sense? Any questions before we start sketching out the MVP milestones?Cool this makes sense, anything else you need to know or think we should plan for / include before that?6:27 PMLet me think through a few things that could bite us later if we don't at least acknowledge them now:
1. Multiple simultaneous sessions
You mentioned working on multiple projects at once. What happens if you have Claude Code running in two different terminals on two different repos? The JSONL structure handles this fine (separate files per session), but your mobile UI needs to handle it. Questions:

Do you want to see all active sessions at once, or focus on one at a time?
If you send a command from your phone, which session does it go to? (I'm assuming "whichever project I have selected" but we should be explicit)

2. The "stop" problem
You said you want to stop an agent in flight. Here's the issue: if Claude Code is mid-task, the clean way to stop it is Ctrl+C in the terminal. From your phone, you'd need to either:

Send a kill signal to the process (works but abrupt)
Somehow inject an interrupt (tricky)

How critical is "stop immediately" versus "just don't approve the next step"? Because if Claude is in --dangerously-skip-permissions mode it'll keep going, but if it's in normal mode it pauses for approval anyway.
3. Approvals and permissions
Speaking of which — how do you typically run Claude Code? Do you:

Let it auto-approve most things
Manually approve each file edit/command
Something in between

Because if you're doing manual approvals, your mobile app basically needs to handle that flow too (show what it wants to do, let you approve/reject).
4. Voice input
You mentioned voice input with a manual "send" button. Just to confirm: you want to dictate a prompt, review the transcription, then tap send? Or something different?
5. What "check the changes" means
When you say you want to review changes the agent made — is git diff sufficient? Or do you want something richer like side-by-side file comparisons? This affects how much UI we need to build versus just linking out to something.is not a problem, don't plan on multi sessionI'd like to be able to stop in realtime.  Abrupt is fine.I let it auto approve a lot, but not all things.  Usually I break work into discrete tasks and have it check after finishing a task.RightGit diff is fine.  I actually care a bit less about seeing the diffs and more seeing the new content, ideally with stuff that changed highlighted in green/red6:30 PMGot it. That clarifies things nicely. A few quick follow-ups then I think we're ready to sketch milestones:
On stopping:
Abrupt kill signal is easy to implement. Just want to flag: if Claude is mid-file-write when you kill it, you could end up with a partially written file. Git will save you (you can always revert), but worth knowing. You okay with that tradeoff?
On the diff view:
So you want to see the full file content with additions highlighted green and deletions highlighted red — not just a compact diff showing only changed lines. More like GitHub's "split view" or "unified view" with full context. That's a bit more work than just dumping git diff output, but not crazy. We'd probably render it in the web UI with some syntax highlighting library.
One more question on approvals:
You said Claude pauses after finishing a task for you to review. When you're at your laptop, how does that work — does it just stop and wait for your next input? If so, from your phone you'd basically:

Get notified "task complete, waiting for input"
Look at what it did (conversation + file changes)
Either send the next prompt or tell it to undo/redo something

Is that the flow you're imagining?

If all that sounds right, I think we have enough to define:

MVP (v0): The bare minimum to be useful on a walk
v1: The "actually pleasant to use" version
v2: Nice-to-haves and polish

Want me to take a crack at outlining those?Yes on the approvals, although I'm also not always going to check what it did, sometimes I'll just send the next prompt.  Yes, take a crack at these.  I'd like the MVP to be more like "minimum loveable product" though so don't make it super totally shitty.6:31 PMLove that framing. "Minimum loveable" means it should actually feel good to use, not just technically work. Let me take a crack at this:

MVP (v0): "I can manage Claude Code from my phone and it doesn't suck"
Core experience:

Open a web UI on your phone (via Tailscale) and immediately see your current project and conversation history
See what Claude is doing right now (or that it's waiting for input)
Send a text prompt and watch it appear in the conversation
Send a voice prompt (dictate → review transcription → tap send)
Get a push notification when Claude finishes a task
Tap a "Stop" button and have it actually stop immediately

What you can see:

Full conversation history for the current session, rendered nicely (syntax highlighting for code, markdown rendered properly)
Status indicator: "working" / "waiting for input" / "idle"
List of files changed this session (just filenames, tappable)
Tap a file → see full file content with changes highlighted (green/red)

What you can do:

Switch between your projects (dropdown or simple list)
Send prompts (text or voice)
Stop the agent
Copy text from conversation or files

What we're NOT building yet:

Quick-select prompt templates
Notification channel options (just one channel for now — probably a simple webhook to something like Pushover or ntfy.sh since they're free/cheap and dead simple)
Fancy real-time streaming (we'll poll every few seconds instead — feels "live enough")

Tech stack (keeping it simple):

Local server: Node.js or Python (your preference?)
Web UI: Single-page React app or even just vanilla HTML/JS
Tailscale for access
Notifications: ntfy.sh (free, no account needed, has iOS app)
File watching: tail the JSONL + Claude Code hooks for "task complete"


v1: "This is actually my preferred way to interact with Claude Code"
Prompt templates:

Define quick-select actions ("Continue to next task", "Run tests", "Commit and push", your custom templates)
Templates live in a config file in your repo (so they're project-specific)
Show as tappable buttons above the input field

Better notifications:

Choose your channel: ntfy, Slack, Telegram, email
Configure per-project notification preferences (maybe you want Slack for work stuff later)

Session management:

See recent sessions (not just current)
Resume a previous session from your phone
Start a new session on a project

Improved diff view:

Side-by-side or unified toggle
Syntax highlighting per language
Expand/collapse unchanged sections

Voice improvements:

Show waveform while recording so you know it's working
Edit transcription before sending (fix mistranscriptions)


v2: "Power user features and polish"
Multi-session awareness:

If you do end up running multiple sessions, see them all
Maybe a "dashboard" view showing all active agents across projects

Command history & favorites:

See your recent prompts
Star/favorite prompts you use often
Search past prompts

Richer git integration:

See commit history from this session
One-tap "undo last change" (git revert)
Create a branch, commit, push — all from phone

Super app integration:

Clean API/embed interface so this can live inside your future productivity super app
Shared auth if needed

Work account support (v2 or separate app):

Okta integration
GitHub org repos
Fully segregated from personal


Questions for you:

Does this progression feel right? Anything in v1 that you'd want pulled into MVP, or vice versa?
For the MVP local server — do you have a preference between Node.js and Python? (Both work fine, just wondering what you're more comfortable debugging if something breaks)
For notifications, have you heard of ntfy.sh? It's free, open source, and has an iOS app. You just POST to a URL and it pings your phone. Zero setup. Alternatively I could do Pushover ($5 one-time) which is slightly more polished. Thoughts?
I think the quick select, templates, tappable buttons, and session management (aside from recent sessions) from v1 are probably things that should be in MVP.  A lot of the UX stuff in v2 is probably not needed either (aside from the richer integrations and work account stuff).  For notifications -- I haven't heard of that, I'd rather not have to install an app though, is it possible to do these via like SMS or something for free?  If not, not a big deal.6:36 PMOn the MVP additions: Makes total sense. The quick-select templates and session resume are core to the "loveable" part — otherwise you're just typing on a phone keyboard which sucks. I'll fold those in.
On notifications via SMS:
Free SMS is tricky. The options are:

Twilio: Pay-per-SMS (~$0.0079/message + a phone number ~$1/month). Cheap but not free.
Email-to-SMS gateways: Free, but janky. You send an email to something like yourphonenumber@txt.att.net and it arrives as SMS. Works but delivery can be slow/unreliable, and you need to know your carrier's gateway domain.
iMessage via Shortcuts: If you're on Mac, you could trigger a Shortcuts automation that sends you an iMessage. Actually kind of elegant since your laptop is already involved.

The iMessage approach is interesting for your setup:
Since your laptop is already running and you're on iOS, you could have the local server trigger an AppleScript or Shortcut that sends you an iMessage. Zero additional apps, zero cost, instant delivery.
Downsides: only works if your laptop is awake (which it is by definition in our architecture), and it's Mac-specific.
Want me to plan for the iMessage/Shortcut approach for MVP, with the option to add other channels later?

Revised MVP scope with your feedback:

Everything from before, plus:
Quick-select prompt templates (tappable buttons, project-configurable)
Resume previous sessions from phone
Start new session on a project
Notifications via iMessage/Shortcut (Mac-native, no extra app)

Does that feel like the right "minimum loveable" scope now?Yeah do the imessage thing until we add slack/etc.6:37 PMPerfect. Let me write up the finalized MVP scope, then we can talk about how to actually break this into buildable chunks.

MVP (v0) — Final Scope
What it is:
A mobile web UI (accessed via Tailscale) for managing Claude Code sessions running on your laptop.
Core screens/views:

Main view:

Current project name + dropdown to switch projects
Status indicator (working / waiting / idle)
Conversation history (rendered markdown, syntax-highlighted code)
Quick-select prompt buttons (project-configurable templates)
Text input field
Voice input button (tap to record → shows transcription → tap send)
Stop button (kills agent immediately)


Files changed view:

List of files modified this session
Tap a file → full content with additions (green) / deletions (red) highlighted


Session picker:

Recent sessions for current project
Tap to resume
"New session" button



Notifications:

iMessage via macOS Shortcut/AppleScript when Claude finishes a task

Config:

Prompt templates defined per-project (probably a JSON or YAML file in the repo)
Default project = last project you had open

Tech decisions:

Local server: Node.js or Python (still need your preference here)
Web UI: Simple React app (or vanilla JS if you prefer minimal dependencies)
Tailscale for phone → laptop access
JSONL file watching for conversation state
Claude Code hooks for task completion → triggers iMessage
git diff under the hood for file changes


What's explicitly out of scope for MVP:

Slack/Telegram/email notifications
Work account / Okta stuff
Multi-session monitoring (parallel agents)
Super app integration
Fancy undo/revert features


Before we break this into dev milestones, one last question:
Do you have a preference on Node.js vs Python for the local server? If you don't care, I'd lean Node since the web UI will be JavaScript anyway and it keeps everything in one language. But Python is equally fine if that's more your comfort zone.