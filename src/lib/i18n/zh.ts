// Simplified Chinese (zh-CN) translation dictionary. Mirrors the shape of
// the canonical English dictionary in `en.ts` (enforced by
// `satisfies Dict`). Keys that the current R0/R1 UI does not render are
// left in English on purpose — the strings will be revisited in R2+ once
// the lesson/remix surfaces land and we know which copy actually ships.

import type { Dict } from "./en";

export const zh: Dict = {
  common: {
    back: "返回",
    welcome: "欢迎",
    backToWelcome: "← 返回首页",
    backToExercises: "返回练习列表",
    unknownError: "未知错误",
    ok: "确定",
    save: "保存",
    saving: "保存中…",
    cancel: "取消",
    language: "语言",
    markdownUtf8: "Markdown · UTF-8",
  },
  home: {
    tagline: "Coding practice that builds thinking, not just code.",
    pitchLead: "Built for the classrooms shaping",
    pitchHighlight: "tomorrow's programmers",
    pitchTail: ".",
    imAStudent: "I'm a student",
    imAStudentHint: "pick an exercise and start working",
    imATeacher: "I'm a teacher",
    imATeacherHint:
      "watch the class live, or review how each student reasoned through a problem",
    published: (n: number) => `${n} exercise${n === 1 ? "" : "s"} published`,
  },
  exercises: {
    title: "Exercise list",
    clickAny: "Click any row to open the exercise.",
    available: (n: number) => `${n} exercise${n === 1 ? "" : "s"} available`,
    completed: (n: number) => `✅ ${n} completed`,
    emptyPrefix: "No exercises published yet — ",
    authorOne: "author one",
    period: ".",
    unitHeader: (roman: string, title: string) => `# Unit ${roman} · ${title}`,
  },
  phaseLabel: {
    "1": "specification",
    "2": "writing",
    "3": "review",
    "4": "closed",
  },
  statusBar: {
    phase: (n: number, label: string) => `phase ${n} · ${label}`,
    unit: (roman: string, title: string) => `Unit ${roman} · ${title}`,
  },
  help: {
    button: "Help, I'm stuck",
    sendError: "Couldn't send notification",
    sendErrorBody:
      "Something went wrong reaching the server. Please try again in a moment.",
    pendingTitle: "Help is on the way",
    pendingBody:
      "Your teacher has been notified. Hang tight — when they reach you, press the button below to resume.",
    resuming: "Resuming…",
    helpIsHere: "Help is here",
    neverMind: "Never mind, I figured it out",
  },
  phase1: {
    roundTitle: (n: number) => `Your specification · round ${n}`,
    intro: "Write, in natural language, what the program must do. Be clear in specifying:",
    bullet1: "What the inputs and outputs are",
    bullet2: "What functions and structures you will use",
    bullet3: "What assumptions you are making",
    unlockNote: "The editor will unlock once the specification is precise enough.",
    placeholder: "The program asks the user for…",
    submit: "Submit specification for review",
    submitting: "Reviewing…",
    hintsTitle: "Some things to think about",
    hintsRound: (n: number) => `round ${n}`,
    hintsFooter:
      "These are suggestions — decide for yourself which ones to pin down in your next specification.",
    earlierRounds: (n: number) => `Earlier rounds · ${n}`,
    opusAsked: "Opus asked",
    roundBadge: "round",
    passed: "✓ passed",
  },
  phase2: {
    comparing: "Comparing your code against your specification…",
    submit: "Submit for review",
    submitting: "Reviewing your work…",
    changeOfPlan: "Change of plan",
    changeOfPlanDesc:
      "What's changing, and why? Your original spec stays on record, and the revision is factored into the final review.",
    amendmentPlaceholder: "What are you changing?",
    why: "Why?",
    reasonFaster: "Faster",
    reasonSimpler: "Simpler",
    reasonMoreCorrect: "More correct",
    reasonOther: "Other",
    otherPlaceholder: "What's the reason?",
    saveRevision: "Save revision",
    chatWithOpus: "Chat with Opus",
    chatSubtitle: "asks about your logic · explains syntax",
    chatEmpty:
      "Ask about your code or about Python syntax. Opus will answer directly for syntax questions, and with counter-questions when you ask about your own approach.",
    you: "you",
    opus: "opus",
    thinking: "thinking…",
    chatPlaceholder: "Ask a question…",
    sendHint: "⌘/Ctrl + Enter to send",
    send: "Send",
    sendShort: "…",
    acceptedSpec: "Your accepted specification",
    run: "Run",
    running: "Running…",
    loadingPython: "Loading Python…",
    consoleHeader: "Console",
    consoleEmpty: "Run your code to see output here.",
    consoleClear: "Clear",
  },
  phase3: {
    sessionComplete: "✓ Session complete.",
    nothingMore: "Nothing more to do — ready for another?",
    headBack: "Head back to Exercise list →",
    reviewSection: "Review",
    noDivergences:
      "Opus found no meaningful divergences between your specification and your code. Nicely done.",
    questionOf: (cur: number, total: number) => `Question ${cur} of ${total}`,
    answeredOf: (done: number, total: number) => `Answered ${done} / ${total}`,
    yourAnswer: "Your answer",
    noAnswer: "(no answer recorded)",
    answerPlaceholder:
      `Answering "I don't know" is valid and often the most useful thing you can say.`,
    submitAnswer: "Submit answer",
    recording: "Recording…",
    answered: "✓ answered",
    iterationHistory: (n: number) =>
      `Specification iteration history · ${n} round${n === 1 ? "" : "s"}`,
    finalSpec: "Your final specification",
    submittedCode: "Your submitted code",
    empty: "(empty)",
    notSubmittedYet: "(not submitted yet)",
    specEmptySuffix: " (empty)",
    revisionPromptTitle: "Want a pass at closing those gaps?",
    revisionPromptBody:
      "You can revise your code now to line it up with your specification. Your original submission and your answers above stay on record — this is an unassisted pass.",
    revisionYes: "Revise my code",
    revisionNo: "I'm done",
    revisionEditingTitle: "Close the gaps",
    revisionEditingBody:
      "Edit your code to line it up with your specification. Your specification is pinned for reference.",
    revisionRecap: "Your divergence answers",
    revisionSubmit: "Submit revised code",
    revisionSubmitting: "Saving…",
    revisionCancel: "Actually, I'm done",
    revisedBadge: "✓ revised",
    finishingUp: "Finishing…",
    startFresh: "Start fresh",
    startingFresh: "Starting…",
    startFreshConfirm:
      "Start a new attempt? Your answers above stay on record — this just gives you a blank slate for another pass.",
  },
  languageSwitcher: {
    label: "语言",
    en: "English",
    es: "Español",
  },
  units: {
    unit_1: "Python Fundamentals",
    unit_2: "Control Structures",
    unit_3: "Data Structures",
    unit_4: "Functions",
  },
};

