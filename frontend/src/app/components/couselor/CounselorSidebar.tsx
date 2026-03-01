"use client";

import type { ReactNode } from "react";
import SessionCard from "./SessionCard";
import StatusBanner, { type StatusBannerVariant } from "./StatusBanner";

export type SidebarTab = "transcript" | "chat";

export type SidebarConversation = {
	uid: string;
	label: string;
	initial: string;
	lastMessage: string;
	timeLabel: string;
};

type CounselorSidebarProps = {
	/** Sign-out handler */
	onSignOut: () => void;
	/** Status banner text (e.g. "AI is actively handling replies") */
	statusText: string;
	/** Status banner variant */
	statusVariant?: StatusBannerVariant;
	/** Currently selected tab */
	selectedTab: SidebarTab;
	/** Tab change handler */
	onTabChange: (tab: SidebarTab) => void;
	/** Conversation count (displayed in the Chat tab badge) */
	conversationCount: number;
	/** Conversation list */
	conversations: SidebarConversation[];
	/** Per-client unread counts */
	unreadCounts: Record<string, number>;
	/** Currently selected client UID */
	selectedClientUid: string;
	/** Client selection handler */
	onSelectClient: (uid: string) => void;
	/** Content to render when transcript tab is active */
	transcriptContent?: ReactNode;
};

export default function CounselorSidebar({
	onSignOut,
	statusText,
	statusVariant = "success",
	selectedTab,
	onTabChange,
	conversationCount,
	conversations,
	unreadCounts,
	selectedClientUid,
	onSelectClient,
	transcriptContent,
}: CounselorSidebarProps) {
	return (
		<aside className="flex h-full flex-col border-r border-[#2a3545] bg-[#0f1724]">
			{/* Header */}
			<div className="flex items-center gap-3 px-4 py-4">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#7c67ff] to-[#5b38f5]">
					<span className="text-sm font-bold text-white">💬</span>
				</div>
				<div className="min-w-0 flex-1">
					<h1 className="text-sm font-bold text-white">Counselor</h1>
					<p className="text-[11px] text-[#8b93a7]">Crisis Support Assistant</p>
				</div>
				<button
					type="button"
					onClick={onSignOut}
					className="shrink-0 rounded-lg border border-[#2a3545] px-3 py-1.5 text-[11px] font-medium text-[#8b93a7] transition-colors hover:border-[#ef4444] hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
				>
					Sign out
				</button>
			</div>

			{/* Status banner */}
			<div className="px-4 pb-3">
				<StatusBanner text={statusText} variant={statusVariant} />
			</div>

			{/* Tabs */}
			<div className="flex items-center gap-1 px-4 pb-3">
				<button
					type="button"
					onClick={() => onTabChange("transcript")}
					className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
						selectedTab === "transcript"
							? "bg-[#243044] text-white"
							: "text-[#8b93a7] hover:text-white"
					}`}
				>
					Transcript
				</button>
				<button
					type="button"
					onClick={() => onTabChange("chat")}
					className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
						selectedTab === "chat"
							? "bg-[#5b6fff] text-white"
							: "text-[#8b93a7] hover:text-white"
					}`}
				>
					Chat
					{conversationCount > 0 ? (
						<span
							className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
								selectedTab === "chat" ? "bg-white/20 text-white" : "bg-[#5b6fff] text-white"
							}`}
						>
							{conversationCount}
						</span>
					) : null}
				</button>
			</div>

			{/* Tab content */}
			<div className="flex-1 overflow-y-auto px-2">
				{selectedTab === "chat" ? (
					<>
						<p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
							Active Sessions
						</p>
						{conversations.length === 0 ? (
							<p className="px-2 py-4 text-xs text-[#64748b]">No active sessions.</p>
						) : (
							<div className="space-y-0.5">
								{conversations.map((conv) => (
									<SessionCard
										key={conv.uid}
										avatarInitial={conv.initial}
										avatarColor="bg-[#22c55e]"
										name={conv.label}
										time={conv.timeLabel}
										lastMessage={conv.lastMessage}
										isSelected={selectedClientUid === conv.uid}
										unreadCount={unreadCounts[conv.uid] ?? 0}
										onClick={() => onSelectClient(conv.uid)}
									/>
								))}
							</div>
						)}
					</>
				) : (
					<div className="p-2">
						{transcriptContent ?? (
							<p className="text-xs text-[#64748b]">No transcripts available.</p>
						)}
					</div>
				)}
			</div>
		</aside>
	);
}
