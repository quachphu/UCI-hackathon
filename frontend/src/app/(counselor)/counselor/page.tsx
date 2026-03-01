"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	addDoc,
	collection,
	doc,
	getDocs,
	limit,
	onSnapshot,
	query,
	serverTimestamp,
	setDoc,
	type Timestamp,
} from "firebase/firestore";
import Agentchoices from "@/app/components/couselor/Agentchoices";
import ChatLog from "@/app/components/couselor/ChatLog";
import type { ConversationRow } from "@/app/components/couselor/ChatLog";
import Transcript from "@/app/components/couselor/Transcript";
import type { HandlerMode } from "@/lib/chat-types";
import { db } from "@/lib/firebase";

type CounselorTab = "transcript" | "chat";

// Admin credentials - multiple users supported
const ADMIN_USERS: { username: string; password: string; uid: string }[] = [
	{ username: "khoi2104", password: "123", uid: "admin_khoi2104" },
	{ username: "syn", password: "123", uid: "admin_syn" },
	{ username: "phu", password: "123", uid: "admin_phu" },
];

const ADMIN_SESSION_KEY = "counselor_admin_session";

type ChatMessage = {
	id: string;
	uid: string;
	clientUid?: string;
	message: string;
	createdAt?: Timestamp;
};

type ChatSessionControl = {
	clientUid: string;
	handlerMode: HandlerMode;
	changedBy?: string;
	changedAt?: Timestamp;
};

function inferClientUid(message: ChatMessage): string {
	if (message.clientUid?.trim()) {
		return message.clientUid;
	}

	const isAdmin = ADMIN_USERS.some((u) => u.uid === message.uid);
	if (!isAdmin) {
		return message.uid;
	}

	return "";
}

export default function CounselorPage() {
	const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
	const [adminUid, setAdminUid] = useState("");
	const [loginUsername, setLoginUsername] = useState("");
	const [loginPassword, setLoginPassword] = useState("");
	const [loginError, setLoginError] = useState("");
	const [selectedTab, setSelectedTab] = useState<CounselorTab>("chat");
	const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
	const [selectedClientUid, setSelectedClientUid] = useState("");
	const [draftMessage, setDraftMessage] = useState("");
	const [status, setStatus] = useState("Ready");
	const [isLoadingMessages, setIsLoadingMessages] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [selectedHandlerMode, setSelectedHandlerMode] = useState<HandlerMode>("ai");
	const [isUpdatingHandlerMode, setIsUpdatingHandlerMode] = useState(false);
	const [handlerModeStatus, setHandlerModeStatus] = useState("AI handles replies by default.");

	const timeFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(undefined, {
				hour: "numeric",
				minute: "2-digit",
			}),
		[],
	);

	useEffect(() => {
		if (window.localStorage.getItem(ADMIN_SESSION_KEY) === "true") {
			setIsAdminAuthenticated(true);
			const storedUid = window.localStorage.getItem("admin_uid") ?? "";
			setAdminUid(storedUid);
		}
	}, []);

	function handleAdminLogin() {
		const validUser = ADMIN_USERS.find(
			(u) => u.username === loginUsername && u.password === loginPassword
		);
		if (validUser) {
			window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
			window.localStorage.setItem("admin_uid", validUser.uid);
			setAdminUid(validUser.uid);
			setIsAdminAuthenticated(true);
			setLoginError("");
			setStatus(`Authenticated as ${validUser.username}.`);
			return;
		}

		setLoginError("Invalid admin credentials.");
	}

	function handleAdminLogout() {
		window.localStorage.removeItem(ADMIN_SESSION_KEY);
		setIsAdminAuthenticated(false);
		setLoginUsername("");
		setLoginPassword("");
		setSelectedClientUid("");
		setDraftMessage("");
		setAllMessages([]);
		setStatus("Signed out.");
	}

	const loadMessages = useCallback(async () => {
		if (!db || !isAdminAuthenticated) {
			setStatus("Firestore not configured.");
			return;
		}

		setIsLoadingMessages(true);
		try {
			const snapshot = await getDocs(query(collection(db, "chat_messages"), limit(500)));
			const items = snapshot.docs.map((doc) => {
				const data = doc.data() as {
					uid?: string;
					clientUid?: string;
					message?: string;
					createdAt?: Timestamp;
				};

				return {
					id: doc.id,
					uid: data.uid ?? "unknown",
					clientUid: data.clientUid,
					message: data.message ?? "",
					createdAt: data.createdAt,
				};
			});

			setAllMessages(items);
			setStatus(`Loaded ${items.length} message(s).`);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to load messages.");
		} finally {
			setIsLoadingMessages(false);
		}
	}, [isAdminAuthenticated]);

	useEffect(() => {
		if (!isAdminAuthenticated) {
			return;
		}

		void loadMessages();
		const intervalId = window.setInterval(() => {
			void loadMessages();
		}, 2000);

		return () => window.clearInterval(intervalId);
	}, [isAdminAuthenticated, loadMessages]);

	const conversations = useMemo<ConversationRow[]>(() => {
		if (!isAdminAuthenticated) {
			return [];
		}

		const byClient = new Map<string, { message: string; ts: number }>();

		for (const item of allMessages) {
			const clientUid = inferClientUid(item);
			if (!clientUid) {
				continue;
			}

			const timestamp = item.createdAt?.toDate()?.getTime() ?? 0;
			const previous = byClient.get(clientUid);
			if (!previous || timestamp >= previous.ts) {
				byClient.set(clientUid, {
					message: item.message || "(empty)",
					ts: timestamp,
				});
			}
		}

		return [...byClient.entries()]
			.map(([uid, info]) => ({
				uid,
				label: uid,
				lastMessage: info.message,
				lastTimestampMs: info.ts,
				timeLabel: info.ts > 0 ? timeFormatter.format(new Date(info.ts)) : "",
			}))
			.sort((a, b) => b.lastTimestampMs - a.lastTimestampMs);
	}, [allMessages, isAdminAuthenticated, timeFormatter]);

	useEffect(() => {
		if (!selectedClientUid && conversations.length > 0) {
			setSelectedClientUid(conversations[0].uid);
		}
	}, [conversations, selectedClientUid]);

	useEffect(() => {
		if (!db || !isAdminAuthenticated || !selectedClientUid) {
			setSelectedHandlerMode("counselor");
			setHandlerModeStatus("Counselor handles replies by default.");
			return;
		}

		const sessionRef = doc(db, "chat_sessions", selectedClientUid);
		const unsubscribe = onSnapshot(
			sessionRef,
			(snapshot) => {
				if (!snapshot.exists()) {
					setSelectedHandlerMode("counselor");
					setHandlerModeStatus("Counselor handles replies by default.");
					return;
				}

				const data = snapshot.data() as Partial<ChatSessionControl>;
				const mode = data.handlerMode === "ai" ? "ai" : "counselor";
				setSelectedHandlerMode(mode);
				setHandlerModeStatus(
					mode === "counselor" ? "Counselor is handling replies." : "AI is handling replies.",
				);
			},
			(error) => {
				setSelectedHandlerMode("counselor");
				setHandlerModeStatus(error.message || "Failed to load handler mode.");
			},
		);

		return () => unsubscribe();
	}, [isAdminAuthenticated, selectedClientUid]);

	const selectedThread = useMemo(() => {
		if (!isAdminAuthenticated || !selectedClientUid) {
			return [] as ChatMessage[];
		}

		return allMessages
			.filter((item) => inferClientUid(item) === selectedClientUid)
			.sort((a, b) => {
				const aMs = a.createdAt?.toDate()?.getTime() ?? 0;
				const bMs = b.createdAt?.toDate()?.getTime() ?? 0;
				return aMs - bMs;
			});
	}, [allMessages, isAdminAuthenticated, selectedClientUid]);

	async function sendReply() {
		if (!db) {
			setStatus("Firestore not configured.");
			return;
		}

		if (!isAdminAuthenticated || !selectedClientUid || draftMessage.trim().length === 0) {
			return;
		}

		try {
			setIsSending(true);
			await addDoc(collection(db, "chat_messages"), {
				uid: adminUid,
				clientUid: selectedClientUid,
				message: draftMessage.trim(),
				source: "counselor_page",
				channelType: "counselor",
				createdAt: serverTimestamp(),
			});
			setDraftMessage("");
			setStatus("Reply sent.");
			await loadMessages();
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to send reply.");
		} finally {
			setIsSending(false);
		}
	}

	async function updateHandlerMode(nextMode: HandlerMode) {
		if (!db || !selectedClientUid) {
			return;
		}

		try {
			setIsUpdatingHandlerMode(true);
			await setDoc(
				doc(db, "chat_sessions", selectedClientUid),
				{
					clientUid: selectedClientUid,
					handlerMode: nextMode,
					changedBy: adminUid,
					changedAt: serverTimestamp(),
				},
				{ merge: true },
			);
			setHandlerModeStatus(
				nextMode === "counselor" ? "Counselor is handling replies." : "AI is handling replies.",
			);
		} catch (error) {
			setHandlerModeStatus(error instanceof Error ? error.message : "Failed to update handler mode.");
		} finally {
			setIsUpdatingHandlerMode(false);
		}
	}

	if (!isAdminAuthenticated) {
		return (
			<main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
				<section className="w-full rounded-xl border border-black/20 p-6 dark:border-white/20">
					<h1 className="text-2xl font-semibold">Counselor Admin Login</h1>
					<p className="mt-2 text-sm text-foreground/70">Use admin credentials to access dashboard.</p>
					<div className="mt-4 space-y-3">
						<input
							type="text"
							placeholder="Username"
							value={loginUsername}
							onChange={(event) => setLoginUsername(event.target.value)}
							className="w-full rounded-md border border-black/20 px-3 py-2 dark:border-white/20"
						/>
						<input
							type="password"
							placeholder="Password"
							value={loginPassword}
							onChange={(event) => setLoginPassword(event.target.value)}
							className="w-full rounded-md border border-black/20 px-3 py-2 dark:border-white/20"
						/>
						<button
							type="button"
							onClick={handleAdminLogin}
							className="w-full rounded-md border border-black bg-black px-4 py-2 font-semibold text-white dark:border-white dark:bg-white dark:text-black"
						>
							Login
						</button>
						{loginError ? <p className="text-sm text-foreground/70">{loginError}</p> : null}
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className="mx-auto min-h-screen w-full max-w-400 px-4 py-6 md:px-6">
			<div className="grid min-h-[86vh] grid-cols-1 overflow-hidden rounded-xl border border-black/20 bg-background md:grid-cols-[420px_1fr] dark:border-white/20">
				<aside className="border-b border-black/20 p-3 md:border-b-0 md:border-r dark:border-white/20">
					<div className="flex items-center justify-between gap-2 rounded-md border border-black/20 p-4 dark:border-white/20">
						<h1 className="text-4xl font-semibold tracking-tight">Crisis Counselor Assistant</h1>
						<button
							type="button"
							onClick={handleAdminLogout}
							className="rounded-md border border-black/20 px-3 py-2 text-xs font-semibold dark:border-white/20"
						>
							Logout
						</button>
					</div>

					<div className="mt-2 grid grid-cols-2 border border-black/20 dark:border-white/20">
						<button
							type="button"
							onClick={() => setSelectedTab("transcript")}
							className={`px-4 py-3 text-left text-3xl font-semibold ${
								selectedTab === "transcript"
									? "bg-black text-white dark:bg-white dark:text-black"
									: "bg-background text-foreground"
							}`}
						>
							Transcript
						</button>
						<button
							type="button"
							onClick={() => setSelectedTab("chat")}
							className={`border-l border-black/20 px-4 py-3 text-left text-3xl font-semibold dark:border-white/20 ${
								selectedTab === "chat"
									? "bg-black text-white dark:bg-white dark:text-black"
									: "bg-background text-foreground"
							}`}
						>
							Chat
						</button>
					</div>

					<div className="mt-2">
						{selectedTab === "chat" ? (
							<ChatLog
								rows={conversations}
								status={status}
								isLoading={isLoadingMessages}
								onRefresh={() => void loadMessages()}
								onSelect={setSelectedClientUid}
								selectedClientUid={selectedClientUid}
							/>
						) : (
							<Transcript />
						)}
					</div>
				</aside>

				<section className="min-h-75 border-t border-black/20 p-4 md:border-t-0 dark:border-white/20">
					{selectedTab === "chat" ? (
						<div className="flex h-full flex-col rounded-lg border border-black/20 dark:border-white/20">
								<header className="border-b border-black/15 px-4 py-3 text-sm font-semibold dark:border-white/15">
									{selectedClientUid ? `Conversation: ${selectedClientUid}` : "Select a conversation"}
								</header>
								{selectedClientUid ? (
									<Agentchoices
										key={`${selectedClientUid}:${selectedHandlerMode}:${isUpdatingHandlerMode}`}
										mode={selectedHandlerMode}
										disabled={isUpdatingHandlerMode}
										onSelectCounselor={() => void updateHandlerMode("counselor")}
										statusText={handlerModeStatus}
									/>
								) : null}

								<div className="min-h-105 flex-1 space-y-3 overflow-y-auto px-4 py-4">
									{selectedClientUid ? (
										selectedThread.length === 0 ? (
											<p className="text-sm text-foreground/70">No messages yet.</p>
										) : (
											selectedThread.map((item) => {
													const isCounselor = ADMIN_USERS.some((u) => u.uid === item.uid) || item.uid === "ai_counselor";
												return (
													<div
														key={item.id}
														className={`flex ${isCounselor ? "justify-end" : "justify-start"}`}
													>
													<div
														className={`max-w-[75%] rounded-2xl border px-3 py-2 text-sm ${
															isCounselor
																? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
																: "border-black/20 bg-background dark:border-white/20"
														}`}
													>
														<p>{item.message || "(empty)"}</p>
														{item.createdAt ? (
															<p className="mt-1 text-[11px] opacity-70">
																{timeFormatter.format(item.createdAt.toDate())}
															</p>
														) : null}
													</div>
												</div>
											);
										})
									)
								) : (
									<p className="text-sm text-foreground/70">Choose a client from the left to start replying.</p>
								)}
							</div>

							<footer className="border-t border-black/15 p-3 dark:border-white/15">
								<div className="flex items-end gap-2">
									<textarea
										className="h-20 flex-1 resize-none rounded-md border border-black/20 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/20"
										placeholder="Type a reply..."
										value={draftMessage}
										onChange={(event) => setDraftMessage(event.target.value)}
										onKeyDown={(event) => {
											if (event.key === "Enter" && !event.shiftKey) {
												event.preventDefault();
												void sendReply();
											}
										}}
									/>
									<button
										type="button"
										onClick={() => void sendReply()}
										disabled={isSending || !selectedClientUid || draftMessage.trim().length === 0}
										className="rounded-md border border-black bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
									>
										{isSending ? "Sending..." : "Send"}
									</button>
								</div>
							</footer>
						</div>
					) : (
						<div className="h-full rounded-lg border border-dashed border-black/25 dark:border-white/25" />
					)}
				</section>
			</div>
		</main>
	);
}
