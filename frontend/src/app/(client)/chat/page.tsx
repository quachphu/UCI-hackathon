"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
	addDoc,
	collection,
	getDocs,
	limit,
	query,
	serverTimestamp,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";

type ChatMessage = {
	id: string;
	message: string;
	uid: string;
};

export default function ClientChatPage() {
	const [message, setMessage] = useState("I need someone to talk to.");
	const [status, setStatus] = useState("Ready");
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

	const canUseFirebase = useMemo(() => Boolean(auth && db && isFirebaseConfigured), []);

	useEffect(() => {
		if (!auth) {
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setCurrentUser(user);
		});

		return unsubscribe;
	}, []);

	async function loadMessages() {
		if (!db) {
			setStatus("Firestore not configured.");
			return;
		}

		try {
			const snapshot = await getDocs(query(collection(db, "chat_messages"), limit(15)));
			const items = snapshot.docs.map((doc) => {
				const data = doc.data() as { message?: string; uid?: string };
				return {
					id: doc.id,
					message: data.message ?? "",
					uid: data.uid ?? "unknown",
				};
			});

			setChatMessages(items);
			setStatus(`Loaded ${items.length} message(s).`);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to load messages.");
		}
	}

	async function sendMessage() {
		if (!db) {
			setStatus("Firestore not configured.");
			return;
		}
		if (!currentUser) {
			setStatus("Please sign in on home page first.");
			return;
		}

		try {
			await addDoc(collection(db, "chat_messages"), {
				message,
				uid: currentUser.uid,
				source: "client_page",
				createdAt: serverTimestamp(),
			});
			setStatus("Message sent.");
			setMessage("");
			await loadMessages();
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to send message.");
		}
	}

	return (
		<main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
			<h1 className="text-3xl font-semibold">Client Chat Test</h1>
			<p className="mt-2 text-sm text-foreground/70">
				Route check for client channel. URL: /chat
			</p>

			<section className="mt-6 rounded-xl border border-black/10 p-4 dark:border-white/10">
				<p className="text-sm">Firebase ready: {canUseFirebase ? "Yes" : "No"}</p>
				<p className="text-sm">Signed in user: {currentUser?.email ?? "none"}</p>
			</section>

			<section className="mt-4 rounded-xl border border-black/10 p-4 dark:border-white/10">
				<label className="text-sm font-medium">Test Message</label>
				<textarea
					className="mt-2 w-full rounded-md border border-black/15 px-3 py-2"
					rows={3}
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					placeholder="Type a message..."
				/>
				<div className="mt-3 flex gap-2">
					<button className="rounded-md border px-3 py-2" onClick={sendMessage}>
						Send
					</button>
					<button className="rounded-md border px-3 py-2" onClick={loadMessages}>
						Reload
					</button>
				</div>
			</section>

			<section className="mt-4 rounded-xl border border-black/10 p-4 dark:border-white/10">
				<p className="text-sm font-medium">Recent chat_messages</p>
				<ul className="mt-2 space-y-2 text-sm">
					{chatMessages.map((item) => (
						<li key={item.id} className="rounded border border-black/10 p-2 dark:border-white/10">
							<span className="font-medium">{item.uid}</span>: {item.message || "(empty)"}
						</li>
					))}
				</ul>
			</section>

			<p className="mt-4 rounded-md bg-black/5 px-3 py-2 text-xs dark:bg-white/10">Status: {status}</p>
		</main>
	);
}
