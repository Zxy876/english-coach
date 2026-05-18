import Link from "next/link";
import { CodeFrame, Comment, SYNTAX } from "@/components/editor/CodeFrame";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// R0 baseline landing page. Real lesson + author surfaces will be scaffolded
// in subsequent rounds (R2 NCE ingest + lesson player, R6 instructor remix
// inspector). The links below point to placeholder routes that render a
// "coming soon" message so the navigation graph stays sane.
export default function Home() {
  return (
    <CodeFrame
      fileName="welcome.md"
      language="Markdown"
      statusLeft={
        <>
          <span>✓ gemini-2.5-flash</span>
          <span>baseline R0</span>
        </>
      }
      statusRight={<span>UTF-8</span>}
      banner={
        <div className="flex items-end justify-between gap-4">
          <Brand />
          <div className="pb-3">
            <LanguageSwitcher />
          </div>
        </div>
      }
      hideTopNav
    >
      {/* 1 */}
      <Comment>
        Narrative-skeleton remix coach grounded in New Concept English.
      </Comment>
      {/* 2 */}
      <Comment>
        Extract the skeleton, write a constrained remix, align it against the
        canonical text, and harvest the language drift.
      </Comment>
      {/* 3 */} <span />
      {/* 4 */}
      <RoleRow
        href="/lessons"
        icon="📖"
        label="I'm a student"
        hint="pick an NCE lesson and write a remix"
      />
      {/* 5 */} <span />
      {/* 6 */}
      <RoleRow
        href="/author"
        icon="🧑‍🏫"
        label="I'm an instructor"
        hint="inspect skeletons and cohort drift"
      />
      {/* 7 */} <span />
    </CodeFrame>
  );
}

function Brand() {
  return (
    <div className="flex items-end gap-3">
      <h1
        className="font-sans font-bold tracking-tight leading-none"
        style={{
          fontSize: "min(14vw, 112px)",
          color: "#f5f5f5",
          letterSpacing: "-0.04em",
        }}
      >
        English Coach
      </h1>
      <span
        className="animate-pulse mb-3 inline-block"
        style={{
          width: "min(2vw, 14px)",
          height: "min(6vw, 48px)",
          backgroundColor: "#007acc",
        }}
        aria-hidden
      />
    </div>
  );
}

function RoleRow({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-4 px-3 -mx-3 rounded transition-colors hover:bg-[#2a2d2e] focus:outline-none focus:bg-[#04395e]"
    >
      <span className="text-[18px] leading-none">{icon}</span>
      <span
        className="font-semibold"
        style={{ color: SYNTAX.function }}
      >
        {label}
      </span>
      <span style={{ color: SYNTAX.comment }}>— {hint}</span>
      <span
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
        style={{ color: SYNTAX.muted }}
      >
        →
      </span>
    </Link>
  );
}
