"use client";

import { useState } from "react";
import type { HandlerMode } from "@/lib/chat-types";

type AgentchoicesProps = {
	mode: HandlerMode;
	disabled?: boolean;
	onSelectCounselor: () => void;
	statusText?: string;
};

export default function Agentchoices({
	mode,
	disabled = false,
	onSelectCounselor,
	statusText,
}: AgentchoicesProps) {
	const [isConfirmingCounselorTakeover, setIsConfirmingCounselorTakeover] = useState(false);

	return (
		<section className="border-b border-black/15 px-4 py-3 dark:border-white/15">
			<p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Reply Handler</p>
			<div className="mt-2">
				<button
					type="button"
					onClick={() => setIsConfirmingCounselorTakeover(true)}
					disabled={disabled || mode === "counselor"}
					className={`w-full rounded-md border px-3 py-2 text-xs font-semibold ${
						mode === "counselor"
							? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
							: "border-black/20 dark:border-white/20"
					} disabled:cursor-not-allowed disabled:opacity-60`}
				>
					I will answer the chat
				</button>
			</div>
			{isConfirmingCounselorTakeover ? (
				<div className="mt-2 flex items-center gap-2">
					<p className="text-xs text-foreground/70">Are you sure?</p>
					<button
						type="button"
						onClick={() => {
							onSelectCounselor();
							setIsConfirmingCounselorTakeover(false);
						}}
						disabled={disabled}
						className="rounded-md border border-black bg-black px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:bg-white dark:text-black"
					>
						Yes
					</button>
					<button
						type="button"
						onClick={() => setIsConfirmingCounselorTakeover(false)}
						disabled={disabled}
						className="rounded-md border border-black/20 px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20"
					>
						No
					</button>
				</div>
			) : null}
			{statusText ? <p className="mt-2 text-xs text-foreground/70">{statusText}</p> : null}
		</section>
	);
}
