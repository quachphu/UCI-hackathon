"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	addDoc,
	collection,
	getDocs,
	limit,
	query,
	serverTimestamp,
	type Timestamp,
} from "firebase/firestore";
import ChatWindow from "@/app/components/chat/ChatWindow";
import type { ChatMessageItem } from "@/app/components/chat/MessageList";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

type ChatMessage = {
	id: string;
	message: string;
	uid: string;
	clientUid?: string;
	createdAt?: Timestamp;
};

export default function ClientChatPage() {
	const { user: currentUser } = useAuth();
	const [guestUid, setGuestUid] = useState("");
	const [message, setMessage] = useState("I need someone to talk to.");
	const [status, setStatus] = useState("Ready");
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [isSending, setIsSending] = useState(false);

	const activeClientUid = currentUser?.uid ?? guestUid;
	const canUseFirebase = useMemo(() => Boolean(auth && db && isFirebaseConfigured), []);

	useEffect(() => {
		if (currentUser) {
			setGuestUid("");
			return;
		}

		const storageKey = "guest_client_uid";
		const savedUid = window.localStorage.getItem(storageKey)?.trim() ?? "";
		if (savedUid) {
			setGuestUid(savedUid);
			return;
		}

		const generatedUid = `guest_${crypto.randomUUID().slice(0, 8)}`;
		window.localStorage.setItem(storageKey, generatedUid);
		setGuestUid(generatedUid);
	}, [currentUser]);

	const loadMessages = useCallback(async () => {
		if (!db || !activeClientUid) {
			setStatus("Firestore not configured.");
			return;
		}

		try {
			const snapshot = await getDocs(query(collection(db, "chat_messages"), limit(300)));
			const items = snapshot.docs
				.map((doc) => {
					const data = doc.data() as {
						message?: string;
						uid?: string;
						clientUid?: string;
						createdAt?: Timestamp;
					};
					return {
						id: doc.id,
						message: data.message ?? "",
						uid: data.uid ?? "unknown",
						clientUid: data.clientUid,
						createdAt: data.createdAt,
					};
				})
				.filter((item) => item.uid === activeClientUid || item.clientUid === activeClientUid);

			setChatMessages(items);
			setStatus(`Loaded ${items.length} message(s).`);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to load messages.");
		}
	}, [activeClientUid]);

	useEffect(() => {
		if (!activeClientUid) {
			return;
		}

		void loadMessages();
		const intervalId = window.setInterval(() => {
			void loadMessages();
		}, 2000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [activeClientUid, loadMessages]);

	const renderedMessages = useMemo<ChatMessageItem[]>(() => {
		const formatter = new Intl.DateTimeFormat(undefined, {
			hour: "numeric",
			minute: "2-digit",
		});
		const currentUid = activeClientUid;

		return [...chatMessages]
			.sort((a, b) => {
				const aMs = a.createdAt?.toDate()?.getTime() ?? 0;
				const bMs = b.createdAt?.toDate()?.getTime() ?? 0;
				return aMs - bMs;
			})
			.map((item) => {
				const isOwn = item.uid === currentUid;
				return {
					id: item.id,
					text: item.message,
					senderLabel: isOwn ? "Me" : "Counselor",
					timeLabel: item.createdAt ? formatter.format(item.createdAt.toDate()) : "",
					isOwn,
				};
			});
	}, [activeClientUid, chatMessages]);

	async function sendMessage() {
		if (!db) {
			setStatus("Firestore not configured.");
			return;
		}
		if (!activeClientUid) {
			setStatus("Preparing guest session...");
			return;
		}

		try {
			setIsSending(true);
			await addDoc(collection(db, "chat_messages"), {
				message,
				uid: activeClientUid,
				clientUid: activeClientUid,
				source: currentUser ? "client_page" : "guest_client_page",
				channelType: "client",
				createdAt: serverTimestamp(),
			});
			setStatus("Message sent.");
			setMessage("");
			await loadMessages();
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to send message.");
		} finally {
			setIsSending(false);
		}
	}

	return (
		<main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
			<ChatWindow
				title={currentUser ? "Client Chat" : "Guest Chat"}
				statusText={`Firebase: ${canUseFirebase ? "ready" : "not configured"} • ${status}`}
				messages={renderedMessages}
				inputValue={message}
				onInputChange={setMessage}
				onSend={sendMessage}
				onReload={loadMessages}
				isSending={isSending}
				emptyText="No client messages yet."
			/>
		</main>
	);
}
