"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db, isFirebaseConfigured } from "@/lib/firebase";

type CaseCard = {
	id: string;
	title: string;
	severity: number;
};

type Transcript = {
	id: string;
	summary: string;
};

type ChatLog = {
	id: string;
	message: string;
};

export default function CounselorPage() {
	const router = useRouter();
	const { user: currentUser, loading } = useAuth();
	const [status, setStatus] = useState("Ready");
	const [caseCards, setCaseCards] = useState<CaseCard[]>([]);
	const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
	const [transcripts, setTranscripts] = useState<Transcript[]>([]);

	async function loadDashboard() {
		if (!db) {
			setStatus("Firestore not configured.");
			return;
		}

		try {
			const [caseSnap, chatSnap, transcriptSnap] = await Promise.all([
				getDocs(query(collection(db, "case_cards"), limit(20))),
				getDocs(query(collection(db, "chat_messages"), limit(20))),
				getDocs(query(collection(db, "call_transcripts"), limit(20))),
			]);

			const nextCaseCards = caseSnap.docs
				.map((doc) => {
					const data = doc.data() as { title?: string; severity?: number };
					return {
						id: doc.id,
						title: data.title ?? "Untitled Case",
						severity: typeof data.severity === "number" ? data.severity : 0,
					};
				})
				.sort((a, b) => b.severity - a.severity);

			const nextChatLogs = chatSnap.docs.map((doc) => {
				const data = doc.data() as { message?: string };
				return {
					id: doc.id,
					message: data.message ?? "",
				};
			});

			const nextTranscripts = transcriptSnap.docs.map((doc) => {
				const data = doc.data() as { summary?: string };
				return {
					id: doc.id,
					summary: data.summary ?? "",
				};
			});

			setCaseCards(nextCaseCards);
			setChatLogs(nextChatLogs);
			setTranscripts(nextTranscripts);
			setStatus("Counselor dashboard loaded.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to load dashboard.");
		}
	}

	useEffect(() => {
		if (!loading && !currentUser) {
			router.replace("/");
			return;
		}

		if (currentUser) {
			void loadDashboard();
		}
	}, [currentUser, loading, router]);

	if (loading) {
		return (
			<main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
				<p className="text-sm text-foreground/70">Checking authentication…</p>
			</main>
		);
	}

	if (!currentUser) {
		return null;
	}

	return (
		<main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
			<h1 className="text-3xl font-semibold">Counselor Dashboard Test</h1>
			<p className="mt-2 text-sm text-foreground/70">
				Route check for counselor channel. URL: /counselor
			</p>

			<div className="mt-6 rounded-xl border border-black/10 p-4 dark:border-white/10">
				<p className="text-sm">Firebase ready: {isFirebaseConfigured ? "Yes" : "No"}</p>
				<p className="text-sm">Signed in user: {currentUser.email ?? "unknown"}</p>
				<button className="mt-3 rounded-md border px-3 py-2 text-sm" onClick={loadDashboard}>
					Refresh
				</button>
			</div>

			<div className="mt-4 grid gap-4 md:grid-cols-3">
				<section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
					<h2 className="font-medium">Case Cards (severity desc)</h2>
					<ul className="mt-2 space-y-2 text-sm">
						{caseCards.map((card) => (
							<li key={card.id} className="rounded border border-black/10 p-2 dark:border-white/10">
								{card.title} · severity {card.severity}
							</li>
						))}
					</ul>
				</section>

				<section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
					<h2 className="font-medium">Chat Logs</h2>
					<ul className="mt-2 space-y-2 text-sm">
						{chatLogs.map((chat) => (
							<li key={chat.id} className="rounded border border-black/10 p-2 dark:border-white/10">
								{chat.message || "(empty)"}
							</li>
						))}
					</ul>
				</section>

				<section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
					<h2 className="font-medium">Call Transcripts</h2>
					<ul className="mt-2 space-y-2 text-sm">
						{transcripts.map((transcript) => (
							<li
								key={transcript.id}
								className="rounded border border-black/10 p-2 dark:border-white/10"
							>
								{transcript.summary || "(empty)"}
							</li>
						))}
					</ul>
				</section>
			</div>

			<p className="mt-4 rounded-md bg-black/5 px-3 py-2 text-xs dark:bg-white/10">Status: {status}</p>
		</main>
	);
}
