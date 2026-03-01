"use client";

import TranscriptEntry from "./TranscriptEntry";

export type TranscriptMessage = {
	role: string;
	content: string;
};

export type TranscriptSession = {
	sessionId: string;
	/** Display label for the session, e.g. "Call with Angela" */
	label: string;
	/** Short description, e.g. "Ruth answered · 9:58" */
	subtitle?: string;
	/** Formatted date/time string, e.g. "Today, 9:26 AM" */
	dateLabel?: string;
	messages: TranscriptMessage[];
};

type TranscriptDetailViewProps = {
	session: TranscriptSession;
	/** Called when the user presses the back button */
	onBack: () => void;
};

/** Map speaker roles to display names */
function speakerName(role: string): string {
	switch (role) {
		case "user":
		case "human":
			return "Client";
		case "assistant":
		case "ai":
			return "AI Counselor";
		default:
			return role;
	}
}

/** Generate a simple mm:ss timestamp based on message index */
function fakeTimestamp(index: number): string {
	const minutes = Math.floor(index * 0.4);
	const seconds = Math.round((index * 0.4 - minutes) * 60);
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Full-screen detail view of a single transcript session.
 * Displays a header with a back arrow, session info, and a scrollable
 * list of TranscriptEntry rows matching the call-log design.
 */
export default function TranscriptDetailView({ session, onBack }: TranscriptDetailViewProps) {
	return (
		<div className="flex h-full flex-col bg-white">
			{/* ── Header ── */}
			<header className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
				<button
					type="button"
					onClick={onBack}
					className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
					aria-label="Back to transcript list"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
						<path
							fillRule="evenodd"
							d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				{/* Phone icon */}
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="h-5 w-5">
						<path
							fillRule="evenodd"
							d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z"
							clipRule="evenodd"
						/>
					</svg>
				</div>

				<div className="min-w-0 flex-1">
					<h2 className="text-base font-semibold text-gray-900">{session.label}</h2>
					{session.subtitle && <p className="text-sm text-gray-500">{session.subtitle}</p>}
				</div>

				{session.dateLabel && (
					<span className="shrink-0 text-xs text-gray-400">{session.dateLabel}</span>
				)}
			</header>

			{/* ── Transcript body ── */}
			<div className="flex-1 overflow-y-auto px-6 py-4">
				<div className="mx-auto max-w-2xl rounded-xl border border-gray-200 px-6 py-4">
					{session.messages.length === 0 ? (
						<p className="py-8 text-center text-sm text-gray-400">No messages in this transcript.</p>
					) : (
						<div className="divide-y divide-gray-100">
							{session.messages.map((msg, i) => (
								<TranscriptEntry
									key={i}
									timestamp={fakeTimestamp(i)}
									speaker={speakerName(msg.role)}
									text={msg.content}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
