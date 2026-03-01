import { NextResponse } from "next/server";

const DEFAULT_API_BASE = "http://localhost:1000";
const DOCKER_BACKEND_BASE = "http://backend:1000";

function isContainerRuntime(): boolean {
	return process.env.DOCKER_CONTAINER === "true" || process.env.KUBERNETES_SERVICE_HOST !== undefined;
}

function normalizeApiBase(input: string): string {
	try {
		const parsed = new URL(input);
		if (isContainerRuntime() && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
			return DOCKER_BACKEND_BASE;
		}
		return parsed.origin;
	} catch {
		return input;
	}
}

function resolveApiBase(): string {
	const configured = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE;
	return normalizeApiBase(configured);
}

export async function POST(req: Request) {
	let payload: { message?: unknown; session_id?: unknown };

	try {
		payload = (await req.json()) as { message?: unknown; session_id?: unknown };
	} catch {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	if (typeof payload.message !== "string" || typeof payload.session_id !== "string") {
		return NextResponse.json(
			{ error: "Both 'message' and 'session_id' must be strings." },
			{ status: 400 },
		);
	}

	const apiBase = resolveApiBase();

	let upstream: Response;
	try {
		upstream = await fetch(`${apiBase}/llm/stream`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				message: payload.message,
				session_id: payload.session_id,
			}),
		});
	} catch {
		return NextResponse.json({ error: "Unable to reach LLM backend upstream." }, { status: 502 });
	}

	if (!upstream.ok || !upstream.body) {
		return NextResponse.json(
			{ error: `Upstream stream failed with status ${upstream.status}.` },
			{ status: upstream.status || 502 },
		);
	}

	return new Response(upstream.body, {
		status: upstream.status,
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		},
	});
}
