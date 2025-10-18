import { CustomerProfile, InterviewRecord } from "@/types/customer";

const STORAGE_KEY = "customer:profiles";

export function getProfiles(): CustomerProfile[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveProfiles(list: CustomerProfile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function saveProfile(profile: CustomerProfile): void {
  const list = getProfiles();
  const idx = list.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    list[idx] = profile;
  } else {
    list.push(profile);
  }
  saveProfiles(list);
}

export function getProfile(id: string): CustomerProfile | null {
  return getProfiles().find((p) => p.id === id) ?? null;
}

export function updateProfile(
  id: string,
  patch: Partial<CustomerProfile>
): CustomerProfile {
  const list = getProfiles();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Profile not found");
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  saveProfiles(list);
  return list[idx];
}

export function upsertInterview(
  profileId: string,
  interview: InterviewRecord
): CustomerProfile {
  const list = getProfiles();
  const idx = list.findIndex((p) => p.id === profileId);
  if (idx < 0) throw new Error("Profile not found");
  list[idx] = {
    ...list[idx],
    interviews: [interview, ...list[idx].interviews],
    updatedAt: new Date().toISOString(),
  };
  saveProfiles(list);
  return list[idx];
}

export function getLastInterviewDate(p: CustomerProfile): string | null {
  return p.interviews[0]?.date ?? null;
}

export function getKeyInsightSnippet(ir: InterviewRecord): string {
  if (!ir.analysis) return "Analysis pending";
  const firstLine = ir.analysis.split("\n").find((line) => line.trim().length > 0);
  return firstLine ?? "Analysis pending";
}

// Interview-specific storage (for backward compatibility with existing /interview/[id] page)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function saveInterview(id: string, data: any): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`interview:${id}`, JSON.stringify(data));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getInterview(id: string): any | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(`interview:${id}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
