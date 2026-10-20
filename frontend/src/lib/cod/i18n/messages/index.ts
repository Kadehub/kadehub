import type { Locale } from "../config";
import { en, type MessageKey } from "./en";
import { si } from "./si";
import { ta } from "./ta";

export type { MessageKey };

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, si, ta };
