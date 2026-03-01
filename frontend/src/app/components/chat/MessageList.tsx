export type ChatMessageItem = {
	id: string;
	text: string;
	senderLabel: string;
	timeLabel?: string;
	isOwn: boolean;
};

export type MessageListTheme = "light" | "dark";

type MessageListProps = {
	messages: ChatMessageItem[];
	emptyText?: string;
	/** Color theme — "light" (default) for client view, "dark" for counselor view */
	theme?: MessageListTheme;
};

function initialsFromLabel(label: string): string {
	const parts = label.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return "?";
	}

	if (parts.length === 1) {
		return parts[0].slice(0, 1).toUpperCase();
	}

	return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

/* ── Theme-aware style maps ────────────────────────────────────── */

const THEME_STYLES = {
	light: {
		empty: "rounded-xl border border-black/10 px-4 py-6 text-center text-sm text-[#5f6578]",
		label: "text-xs font-semibold text-[#4c5266]",
		time: "mt-1 text-[11px] text-[#70778d]",
		avatarOwn: "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5b6fff] text-xs font-bold text-white",
		avatarOther: "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-xs font-bold text-white",
		bubbleOwn: "mt-1 rounded-2xl border border-transparent bg-linear-to-b from-[#6b4dff] to-[#5a33f0] text-white px-3 py-2 text-sm",
		bubbleOther: "mt-1 rounded-2xl border border-transparent bg-[#e3e4ea] text-[#222632] px-3 py-2 text-sm",
	},
	dark: {
		empty: "rounded-xl border border-[#2a3545] px-4 py-6 text-center text-sm text-[#64748b]",
		label: "text-xs font-semibold text-[#8b93a7]",
		time: "mt-1 text-[11px] text-[#64748b]",
		avatarOwn: "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5b6fff] text-xs font-bold text-white",
		avatarOther: "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-xs font-bold text-white",
		bubbleOwn: "mt-1 rounded-2xl border border-transparent bg-linear-to-b from-[#5b6fff] to-[#4f5dff] text-white px-3 py-2 text-sm",
		bubbleOther: "mt-1 rounded-2xl border border-transparent bg-[#1e293b] text-white px-3 py-2 text-sm",
	},
} as const;

export default function MessageList({ messages, emptyText = "No messages yet.", theme = "light" }: MessageListProps) {
	const s = THEME_STYLES[theme];

	if (messages.length === 0) {
		return <div className={s.empty}>{emptyText}</div>;
	}

	return (
		<ul className="space-y-4">
			{messages.map((message) => (
				<li
					key={message.id}
					className={`flex items-start gap-2 ${message.isOwn ? "justify-end" : "justify-start"}`}
				>
					{!message.isOwn ? (
						<div className={s.avatarOther}>
							{initialsFromLabel(message.senderLabel)}
						</div>
					) : null}

					<div className={`max-w-[80%] ${message.isOwn ? "text-right" : "text-left"}`}>
						<p className={s.label}>{message.senderLabel}</p>
						<div className={message.isOwn ? s.bubbleOwn : s.bubbleOther}>
							{message.text || "(empty)"}
						</div>
						{message.timeLabel ? (
							<p className={s.time}>{message.timeLabel}</p>
						) : null}
					</div>

					{message.isOwn ? (
						<div className={s.avatarOwn}>
							{initialsFromLabel(message.senderLabel)}
						</div>
					) : null}
				</li>
			))}
		</ul>
	);
}
