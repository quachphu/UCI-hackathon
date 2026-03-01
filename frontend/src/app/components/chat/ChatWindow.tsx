import MessageInput from "./MessageInput";
import MessageList, { type ChatMessageItem } from "./MessageList";

export type ChatWindowTheme = "light" | "dark";

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
	/** Color theme — "light" (default) or "dark" */
	theme?: ChatWindowTheme;
};

const THEME_STYLES = {
	light: {
		section: "mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-[#d9d9de] bg-white/95 backdrop-blur-sm",
		header: "flex items-center justify-between border-b border-[#e4e4ea] bg-white px-4 py-3 text-[#1f1f25]",
		statusText: "text-xs text-[#6f6f7a]",
		headerBtn: "rounded-md border border-[#d7d7df] px-2 py-1 text-[#5f5f69]",
		body: "h-[65vh] overflow-y-auto bg-white px-4 py-4",
		footer: "border-t border-[#e4e4ea] px-3 py-3 bg-white/95",
	},
	dark: {
		section: "mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-[#2a3545] bg-[#0f1724]",
		header: "flex items-center justify-between border-b border-[#2a3545] bg-[#0f1724] px-4 py-3 text-white",
		statusText: "text-xs text-[#64748b]",
		headerBtn: "rounded-md border border-[#2a3545] px-2 py-1 text-[#8b93a7] hover:bg-[#243044]",
		body: "h-[65vh] overflow-y-auto bg-[#0f1724] px-4 py-4",
		footer: "border-t border-[#2a3545] px-3 py-3 bg-[#0f1724]",
	},
} as const;

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
	theme = "light",
}: ChatWindowProps) {
	const s = THEME_STYLES[theme];

	return (
		<section className={s.section}>
			<header className={s.header}>
				<div>
					<p className="text-xl font-semibold">{title}</p>
					<p className={s.statusText}>{statusText ?? "Connected"}</p>
				</div>
				<div className="flex items-center gap-2 text-sm">
					<button type="button" className={s.headerBtn}>Video</button>
					<button type="button" className={s.headerBtn}>Call</button>
					<button type="button" className={s.headerBtn}>More</button>
				</div>
			</header>

			<div className={s.body}>
				<MessageList messages={messages} emptyText={emptyText} theme={theme} />
			</div>

			<footer className={s.footer}>
				<MessageInput
					value={inputValue}
					onChange={onInputChange}
					onSend={onSend}
					onReload={onReload}
					isSending={isSending}
					theme={theme}
				/>
			</footer>
		</section>
	);
}
