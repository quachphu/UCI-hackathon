export type ChatMessageItem = {
	id: string;
	text: string;
	senderLabel: string;
	timeLabel?: string;
	isOwn: boolean;
};

type MessageListProps = {
	messages: ChatMessageItem[];
	emptyText?: string;
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

export default function MessageList({ messages, emptyText = "No messages yet." }: MessageListProps) {
	if (messages.length === 0) {
		return (
			<div className="rounded-xl border border-black/10 px-4 py-6 text-center text-sm text-foreground/60 dark:border-white/10">
				{emptyText}
			</div>
		);
	}

	return (
		<ul className="space-y-4">
			{messages.map((message) => (
				<li
					key={message.id}
					className={`flex items-start gap-2 ${message.isOwn ? "justify-end" : "justify-start"}`}
				>
					{!message.isOwn ? (
						<div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/20 text-xs font-semibold dark:border-white/20">
							{initialsFromLabel(message.senderLabel)}
						</div>
					) : null}

					<div className={`max-w-[80%] ${message.isOwn ? "text-right" : "text-left"}`}>
						<p className="text-xs font-semibold text-foreground/80">{message.senderLabel}</p>
						<div
							className={`mt-1 rounded-2xl border px-3 py-2 text-sm ${
								message.isOwn
									? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
									: "border-black/15 bg-white text-black dark:border-white/15 dark:bg-black dark:text-white"
							}`}
						>
							{message.text || "(empty)"}
						</div>
						{message.timeLabel ? (
							<p className="mt-1 text-[11px] text-foreground/60">{message.timeLabel}</p>
						) : null}
					</div>

					{message.isOwn ? (
						<div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/20 text-xs font-semibold dark:border-white/20">
							{initialsFromLabel(message.senderLabel)}
						</div>
					) : null}
				</li>
			))}
		</ul>
	);
}
