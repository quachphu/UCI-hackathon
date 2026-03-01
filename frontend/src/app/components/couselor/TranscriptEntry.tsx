"use client";

export type TranscriptEntryProps = {
	/** Timestamp label, e.g. "0:01", "0:05" */
	timestamp: string;
	/** Speaker name, e.g. "Angela Campbell" */
	speaker: string;
	/** The message text */
	text: string;
};

/**
 * A single row in a call transcript.
 * Renders a left-aligned timestamp, bold speaker name, and message text.
 * Reusable anywhere a transcript-style log is needed.
 */
export default function TranscriptEntry({ timestamp, speaker, text }: TranscriptEntryProps) {
	return (
		<div className="flex gap-4 py-2">
			<span className="w-10 shrink-0 text-sm text-gray-400">{timestamp}</span>
			<p className="text-sm leading-relaxed text-gray-800">
				<span className="font-bold text-gray-900">{speaker}:</span> {text}
			</p>
		</div>
	);
}
