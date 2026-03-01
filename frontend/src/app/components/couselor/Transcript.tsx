"use client";

import { useState } from "react";

interface Message {
	role: string;
	content: string;
}

export default function Transcript() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchTranscript = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("http://localhost:1000/llm/history/1");
			if (!res.ok) throw new Error(`Error ${res.status}`);
			const data = await res.json();
			setMessages(data.messages ?? []);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to fetch transcript");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="space-y-3">
			<button
				onClick={fetchTranscript}
				disabled={loading}
				className="flex items-center gap-2 rounded-full bg-[#1e293b] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#334155] disabled:opacity-50"
			>
				{/* refresh icon */}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
				>
					<path
						fillRule="evenodd"
						d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311V15a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75H8.5a.75.75 0 0 1 0 1.5H7.058l.166.166a4 4 0 0 0 6.693-1.793.75.75 0 0 1 1.395.3ZM4.688 8.576a5.5 5.5 0 0 1 9.201-2.466l.312.311V5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75H11.5a.75.75 0 0 1 0-1.5h1.442l-.166-.166a4 4 0 0 0-6.693 1.793.75.75 0 1 1-1.395-.3Z"
						clipRule="evenodd"
					/>
				</svg>
				{loading ? "Fetching…" : "Fetch Transcripts"}
			</button>

			{error && <p className="text-sm text-red-400">{error}</p>}

			{messages.length === 0 && !loading && !error && (
				<p className="text-sm text-[#64748b]">No transcripts available.</p>
			)}

			{messages.length > 0 && (
				<ul className="space-y-2">
					{messages.map((msg, i) => (
						<li
							key={i}
							className={`rounded-lg px-3 py-2 text-sm ${
								msg.role === "user"
									? "bg-[#1e293b] text-[#cbd5e1]"
									: "bg-[#243044] text-white"
							}`}
						>
							<span className="font-semibold capitalize">{msg.role}: </span>
							{msg.content}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
