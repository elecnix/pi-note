// pi-note — /note and /private-note slash commands for the pi coding agent.
//
//   /note <text>        A note the AGENT will see on its next turn.
//                       Injected as a custom message into LLM context, but queued
//                       for the next user prompt — it does NOT trigger a turn or
//                       any steering.
//
//   /private-note <t>   A note the AGENT will NEVER see. Persisted as a custom
//                       entry that is excluded from LLM context.
//
// Both commands short-circuit before agent processing (registered commands never
// reach a turn) and both confirm via a TUI notification.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Box, Text } from "@earendil-works/pi-tui";

const NOTE_TYPE = "note"; // custom MESSAGE (in LLM context)
const PRIVATE_TYPE = "private-note"; // custom ENTRY (never in LLM context)

export default function (pi: ExtensionAPI) {
	// /note <text> — the agent sees it on the next turn.
	pi.registerCommand("note", {
		description: "Add a note the agent will see on the next turn (no turn triggered)",
		handler: async (args, ctx) => {
			const text = (args ?? "").trim();
			if (!text) {
				ctx.ui.notify("Usage: /note <text>", "info");
				return;
			}
			// Custom MESSAGE: participates in LLM context. Deliver as "nextTurn" so
			// it is queued for the next user prompt and triggers/steers nothing.
			pi.sendMessage(
				{
					customType: NOTE_TYPE,
					content: text,
					display: true,
					details: { timestamp: Date.now() },
				},
				{ deliverAs: "nextTurn" },
			);
			ctx.ui.notify(`📝 note queued for next turn (${text.length} chars)`, "success");
		},
	});

	// /private-note <text> — the agent NEVER sees it.
	pi.registerCommand("private-note", {
		description: "Add a private note the agent will never see (no turn triggered)",
		handler: async (args, ctx) => {
			const text = (args ?? "").trim();
			if (!text) {
				ctx.ui.notify("Usage: /private-note <text>", "info");
				return;
			}
			// Custom ENTRY: never enters LLM context; persisted in the session file.
			pi.appendEntry(PRIVATE_TYPE, { text, createdAt: Date.now() });
			ctx.ui.notify(`🔒 private note saved (${text.length} chars, hidden from agent)`, "success");
		},
	});

	// Render /note custom messages inline in the transcript too.
	pi.registerMessageRenderer(NOTE_TYPE, (message, { expanded }, theme) => {
		const box = new Box(1, 1, (t) => theme.bg("customMessageBg", t));
		box.addChild(new Text(theme.bold("📝 note")));
		if (typeof message.content === "string") box.addChild(new Text(message.content));
		if (expanded) {
			const ts = (message.details as { timestamp?: number } | undefined)?.timestamp;
			if (ts) box.addChild(new Text(theme.fg("dim", new Date(ts).toLocaleString())));
		}
		return box;
	});

	// Render /private-note entries inline as well.
	pi.registerEntryRenderer(PRIVATE_TYPE, (entry, { expanded }, theme) => {
		const data = (entry.data ?? {}) as { text?: string; createdAt?: number };
		const box = new Box(1, 1, (t) => theme.bg("customMessageBg", t));
		box.addChild(new Text(theme.bold("🔒 private note")));
		if (data.text) box.addChild(new Text(data.text));
		if (expanded && data.createdAt) {
			box.addChild(new Text(theme.fg("dim", new Date(data.createdAt).toLocaleString())));
		}
		return box;
	});
}