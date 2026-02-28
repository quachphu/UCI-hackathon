"use client";

export type ConversationRow = {
	uid: string;
	label: string;
	lastMessage: string;
	lastTimestampMs: number;
	timeLabel: string;
};

type ChatlogProps = {
	rows: ConversationRow[];
	status: string;
	isLoading: boolean;
	onRefresh: () => void;
	onSelect: (clientUid: string) => void;
	selectedClientUid: string;
};

export default function Chatlog({
	rows,
	status,
	isLoading,
	onRefresh,
	onSelect,
	selectedClientUid,
}: ChatlogProps) {

	return (
		<section className="rounded-b-xl border border-black/20 dark:border-white/20">
			<header className="flex items-center justify-between border-b border-black/15 px-3 py-2 dark:border-white/15">
				<h2 className="text-[42px] font-semibold leading-none">All Messages</h2>
				<button
					type="button"
					onClick={onRefresh}
					disabled={isLoading}
					className="rounded border border-black/30 px-2 py-1 text-xs font-medium hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/30 dark:hover:bg-white dark:hover:text-black"
				>
					{isLoading ? "Refreshing..." : "Refresh"}
				</button>
			</header>

			<div className="max-h-[64vh] overflow-y-auto p-2">
				{rows.length === 0 ? (
					<p className="rounded border border-black/10 p-3 text-sm text-foreground/70 dark:border-white/10">
						No client messages found.
					</p>
				) : (
					<ul className="space-y-2">
						{rows.map((row) => (
							<li key={row.uid}>
								<button
									type="button"
									onClick={() => onSelect(row.uid)}
									className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left ${
										selectedClientUid === row.uid
											? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
											: "border-black/15 dark:border-white/15"
									}`}
								>
									<div className="h-12 w-12 rounded-full border border-black/20 bg-black/5 dark:border-white/20 dark:bg-white/5" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-2xl font-semibold leading-tight">{row.label}</p>
										<p className="truncate text-sm opacity-80">{row.lastMessage}</p>
									</div>
									<p className="shrink-0 text-xs opacity-80">{row.timeLabel || ""}</p>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			<p className="border-t border-black/10 px-3 py-2 text-xs text-foreground/65 dark:border-white/10">
				{status}
			</p>
		</section>
	);
}
