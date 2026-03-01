export type StreamAIOptions = {
	signal?: AbortSignal;
	endpoint?: string;
	onToken?: (token: string, fullText: string) => void;
	onDone?: (fullText: string) => void;
	onError?: (error: Error) => void;
};

export async function streamAIResponse(
	message: string,
	sessionId: string,
	options: StreamAIOptions = {},
): Promise<{ fullText: string; wasAborted: boolean }> {
	const endpoint = options.endpoint ?? "/api/llm/stream";
	let fullText = "";
	let wasAborted = false;

	try {
		const res = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				message,
				session_id: sessionId,
			}),
			signal: options.signal,
		});

		if (!res.ok || !res.body) {
			throw new Error(`Stream error ${res.status}`);
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed.startsWith("data: ")) continue;
				const payload = trimmed.slice(6);
				if (payload === "[DONE]") continue;
				fullText += payload;
				options.onToken?.(payload, fullText);
			}
		}

		options.onDone?.(fullText);
		return { fullText, wasAborted };
	} catch (error) {
		const err = error as Error;
		if (err.name === "AbortError") {
			wasAborted = true;
			return { fullText, wasAborted };
		}
		options.onError?.(err);
		throw err;
	}
}
