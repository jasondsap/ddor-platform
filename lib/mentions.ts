// Shared mention utilities for messages and notes.
// Storage format inside a message/note body: @[Display Name](type:uuid)
//
// Example:
//   "Hi @[Erin Henle](user:abc-123), please check on @[Jane Doe](client:xyz-789)"
//
// Types currently supported: 'user' and 'client'. Add more as the platform grows.

export type MentionType = 'user' | 'client';

export interface Mention {
    type: MentionType;
    name: string;
    id: string;
}

export interface MentionSuggestion {
    type: MentionType;
    name: string;
    id: string;
    subtitle?: string;
}

// Match @[name](type:id) where:
//   - name is anything except a literal ]
//   - type is letters only (so the colon delimits cleanly)
//   - id is anything except ) so UUIDs are fine
const MENTION_REGEX = /@\[([^\]]+)\]\(([a-z_]+):([^)]+)\)/g;

/** Extract every mention reference from a body string. */
export function parseMentions(body: string): Mention[] {
    const out: Mention[] = [];
    if (!body) return out;
    const re = new RegExp(MENTION_REGEX.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
        const type = m[2] as MentionType;
        if (type === 'user' || type === 'client') {
            out.push({ type, name: m[1], id: m[3] });
        }
    }
    return out;
}

/** Format a mention item into the storage syntax (used by insertMention). */
export function formatMention(item: { type: MentionType; name: string; id: string }): string {
    return `@[${item.name}](${item.type}:${item.id})`;
}

/**
 * Replace `@[Name](type:id)` references with the plain-text `@Name`. Used for
 * notification previews where we want a clamp-friendly string, not HTML.
 */
export function stripMentions(body: string): string {
    if (!body) return '';
    return body.replace(MENTION_REGEX, (_, name) => `@${name}`);
}

export interface RenderOptions {
    /**
     * Whether user-type mentions should render as clickable links.
     * Notes set this to false (no user profile page exists yet — see
     * TODO(user-profile)). Messages set it to true today; behavior unchanged.
     */
    clickableUserMentions?: boolean;
    /**
     * Treat the body as plain text and escape HTML before substituting
     * mention spans. Defaults to true.
     */
    escapeHtml?: boolean;
}

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => HTML_ESCAPES[c] || c);
}

/**
 * Convert a body string with `@[Name](type:id)` mentions into safe HTML.
 *
 * - Client mentions: <a href="/clients/{id}"> (always clickable)
 * - User mentions: <a> when clickableUserMentions=true (default for messages),
 *   <span> when false (notes — no user profile page exists yet).
 *
 * TODO(user-profile): When a user profile page exists, drop the
 * clickableUserMentions flag and always render user mentions as <a>.
 */
export function renderMentions(body: string, opts: RenderOptions = {}): string {
    const { clickableUserMentions = true, escapeHtml: doEscape = true } = opts;
    if (!body) return '';

    // Escape, then substitute. Since the storage syntax uses [] () characters
    // that don't need HTML escaping, this is safe — the regex still matches.
    const safe = doEscape ? escapeHtml(body) : body;

    return safe.replace(MENTION_REGEX, (_, name, type, id) => {
        const safeName = escapeHtml(String(name));
        const safeId = encodeURIComponent(String(id));
        if (type === 'client') {
            return `<a href="/clients/${safeId}" style="color:#1A73A8;font-weight:500;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">@${safeName}</a>`;
        }
        if (type === 'user') {
            if (clickableUserMentions) {
                return `<a href="#" style="color:#8B5CF6;font-weight:500;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">@${safeName}</a>`;
            }
            return `<span style="color:#8B5CF6;font-weight:500;">@${safeName}</span>`;
        }
        return `@${safeName}`;
    });
}
