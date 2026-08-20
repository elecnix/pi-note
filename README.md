# pi-note

Slash commands for the [pi coding agent](https://pi.dev) to jot notes down **without triggering an agent turn**:

| Command | What it does | Agent sees it? |
|---------|--------------|----------------|
| `/note <text>` | Inject a note the agent **sees on its very next turn** | ✅ yes (injected into LLM context) |
| `/private-note <text>` | Persist a note the agent **never sees** | ❌ no (excluded from LLM context) |

Both commands:
- are handled **before agent dispatch**, so they **never start a turn and never steer**;
- confirm with a **TUI notification**;
- persist to the **session file**, so you can mine them later.

## Install

```bash
pi install git:github.com/elecnix/pi-note
```

That adds the extension to your settings. Reload with `/reload` (or restart pi), then both commands are available. You can also drop `src/index.ts` into `~/.pi/agent/extensions/` (global) or `.pi/extensions/` (project-local), then `/reload`.

## Usage

```text
/note remember to push at 5pm
> 📝 note queued for next turn (31 chars)

/private-note the staging token is 12345
> 🔒 private note saved (hidden from agent)
```

- **`/note <text>`** — becomes a **custom message** in the conversation, queued for the *next* user prompt (`deliverAs: "nextTurn"`). The agent sees it on the next turn; nothing is triggered at `/note` time.
- **`/private-note <text>`** — becomes a **custom entry** (via `appendEntry`), which pi never sends to the LLM. Good for secrets, passwords, TODOs, and host-side remarks.

One warning: pi resolves every enabled command, so if another extension also registers `/note`, pi disambiguates with numeric suffixes (`/note:1`, `/note:2`). If things feel off, check your other extensions.

Note that `/note` is delivered on your *next* prompt. If you quit pi before sending another prompt, the pending note has not been delivered to the model yet (it is rehydrated from the session on resume); re-invoking it surfaces it.

## How it works

Both commands short-circuit because pi runs registered extension commands **before** dispatching to the model. The two commands map to two different persistence primitives:

- `/note` → [`pi.sendMessage(..., { deliverAs: "nextTurn" })`](https://pi.dev/docs/latest/extensions#pismessage-and-pisendusermessage) — a `custom_message` **participates in LLM context** but is only delivered on the next prompt, so it neither triggers a turn nor steers.
- `/private-note` → [`pi.appendEntry()`](https://pi.dev/docs/latest/extensions#piappendentry) — a `custom` entry **never participates in LLM context**; it survives restarts and is the intended home for host-side data.

## Mining the notes later

Sessions are JSONL under `~/.pi/agent/sessions/`. Filter for the two entry shapes:

```bash
# every note (model-visible custom_message)
jq -r 'select(.type=="custom_message" and .customType=="note") | .content' \
  ~/.pi/agent/sessions/**/*.jsonl

# every private note (custom entry — never in the agent's context)
jq -r 'select(.type=="custom" and .customType=="private-note") | .data.text' \
  ~/.pi/agent/sessions/**/*.jsonl
```

## License

MIT — see [LICENSE](LICENSE).