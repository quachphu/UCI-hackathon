"use client";

import type { HandlerMode } from "@/lib/chat-types";

type AgentchoicesProps = {
	mode: HandlerMode;
	disabled?: boolean;
	onSelectAI: () => void;
	onSelectCounselor: () => void;
	statusText?: string;
};

export default function Agentchoices({
	mode,
	disabled = false,
	onSelectAI,
	onSelectCounselor,
	statusText,
}: AgentchoicesProps) {
	return (
		<section className="border-b border-black/15 px-4 py-3 dark:border-white/15">
			<p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Reply Handler</p>
			<div className="mt-2 grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={onSelectAI}
					disabled={disabled || mode === "ai"}
					className={`rounded-md border px-3 py-2 text-xs font-semibold ${
						mode === "ai"
							? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
							: "border-black/20 dark:border-white/20"
					} disabled:cursor-not-allowed disabled:opacity-60`}
				>
					Let AI take over
				</button>
				<button
					type="button"
					onClick={onSelectCounselor}
					disabled={disabled || mode === "counselor"}
					className={`rounded-md border px-3 py-2 text-xs font-semibold ${
						mode === "counselor"
							? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
							: "border-black/20 dark:border-white/20"
					} disabled:cursor-not-allowed disabled:opacity-60`}
				>
					I will answer the chat
				</button>
			</div>
			{statusText ? <p className="mt-2 text-xs text-foreground/70">{statusText}</p> : null}
		</section>
	);
}
