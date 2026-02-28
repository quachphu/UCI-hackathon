type MessageInputProps = {
	value: string;
	onChange: (value: string) => void;
	onSend: () => void;
	onReload?: () => void;
	isSending?: boolean;
	placeholder?: string;
};

export default function MessageInput({
	value,
	onChange,
	onSend,
	onReload,
	isSending = false,
	placeholder = "Send messages...",
}: MessageInputProps) {
	return (
		<div className="rounded-2xl border border-black/20 px-3 py-2 dark:border-white/20">
			<div className="flex items-end gap-2">
				<div className="flex items-center gap-2 pb-2 text-lg text-foreground/80">
					<button type="button" className="leading-none" aria-label="Emoji">
						☺
					</button>
					<button type="button" className="leading-none" aria-label="Attach">
						⌁
					</button>
				</div>

				<textarea
					className="h-10 max-h-28 flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none"
					rows={1}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							onSend();
						}
					}}
					placeholder={placeholder}
				/>

				{onReload ? (
					<button
						type="button"
						onClick={onReload}
						className="rounded-md border border-black/20 px-3 py-2 text-xs font-medium hover:bg-black hover:text-white dark:border-white/20 dark:hover:bg-white dark:hover:text-black"
					>
						Reload
					</button>
				) : null}

				<button
					type="button"
					onClick={onSend}
					disabled={isSending || value.trim().length === 0}
					className="rounded-md border border-black bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
				>
					{isSending ? "Sending..." : "Send"}
				</button>
			</div>
		</div>
	);
}
