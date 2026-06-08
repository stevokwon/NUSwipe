// Structured logger — thin wrapper kept swap-friendly (pino, winston, etc.).
//
// PRIVACY RULE (AGENTS.md §9): Never log sensitive APAC field VALUES.
// Log the field *name* only:
//   logger.warn({ field: "sg_residency" }, "Unknown value — omitted")   ✓
//   logger.warn({ field: "sg_residency", value: "Citizen" }, "...")     ✗

type Meta = Record<string, unknown>;

function format(level: string, meta: Meta, message: string): string {
  const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
  return `[${level.toUpperCase()}]${metaStr} ${message}`;
}

export const logger = {
  info(meta: Meta, message: string): void {
    if (process.env.NODE_ENV !== "test") {
      console.info(format("info", meta, message));
    }
  },
  warn(meta: Meta, message: string): void {
    if (process.env.NODE_ENV !== "test") {
      console.warn(format("warn", meta, message));
    }
  },
  error(meta: Meta, message: string): void {
    console.error(format("error", meta, message));
  },
};
