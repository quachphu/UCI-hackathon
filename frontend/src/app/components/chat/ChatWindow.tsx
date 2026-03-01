import MessageInput from "./MessageInput";
import MessageList, { type ChatMessageItem } from "./MessageList";

type ChatWindowProps = {
	title: string;
	statusText?: string;
	messages: ChatMessageItem[];
	inputValue: string;
	onInputChange: (value: string) => void;
	onSend: () => void;
	onReload?: () => void;
	isSending?: boolean;
	emptyText?: string;
};

export default function ChatWindow({
	title,
	statusText,
	messages,
	inputValue,
	onInputChange,
	onSend,
	onReload,
	isSending = false,
	emptyText,
}: ChatWindowProps) {
	return (
		<section className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-black/20 bg-background dark:border-white/20">
			<header className="flex items-center justify-between border-b border-black/15 bg-black px-4 py-3 text-white dark:border-white/20 dark:bg-white dark:text-black">
				<div>
					<p className="text-xl font-semibold">{title}</p>
					<p className="text-xs text-white/80 dark:text-black/70">{statusText ?? "Connected"}</p>
				</div>
				<div className="flex items-center gap-2 text-sm">
					<button type="button" className="rounded-md border border-white/30 px-2 py-1 dark:border-black/30">
						Video
					</button>
					<button type="button" className="rounded-md border border-white/30 px-2 py-1 dark:border-black/30">
						Call
					</button>
					<button type="button" className="rounded-md border border-white/30 px-2 py-1 dark:border-black/30">
						More
					</button>
				</div>
			</header>

			<div className="h-[65vh] overflow-y-auto bg-background px-4 py-4">
				<MessageList messages={messages} emptyText={emptyText} />
			</div>

			<footer className="border-t border-black/15 px-3 py-3 dark:border-white/15">
				<MessageInput
					value={inputValue}
					onChange={onInputChange}
					onSend={onSend}
					onReload={onReload}
					isSending={isSending}
				/>
			</footer>
		</section>
	);
}
