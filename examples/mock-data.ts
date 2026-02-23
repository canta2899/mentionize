export interface User {
  id: string;
  name: string;
  role: string;
}

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export const USERS: User[] = [
  { id: "u1", name: "Alice Johnson", role: "Engineer" },
  { id: "u2", name: "Bob Smith", role: "Designer" },
  { id: "u3", name: "Charlie Brown", role: "PM" },
  { id: "u4", name: "Diana Prince", role: "Engineer" },
  { id: "u5", name: "Eve Torres", role: "Data Scientist" },
  { id: "u6", name: "Frank Castle", role: "DevOps" },
  { id: "u7", name: "Grace Hopper", role: "Engineer" },
  { id: "u8", name: "Hank Pym", role: "Researcher" },
  { id: "u9", name: "Iris West", role: "Journalist" },
  { id: "u10", name: "Jack Ryan", role: "Analyst" },
];

export const TAGS: Tag[] = [
  { id: "t1", label: "bug", color: "#e74c3c" },
  { id: "t2", label: "feature", color: "#2ecc71" },
  { id: "t3", label: "docs", color: "#3498db" },
  { id: "t4", label: "urgent", color: "#e67e22" },
  { id: "t5", label: "help-wanted", color: "#9b59b6" },
  { id: "t6", label: "good-first-issue", color: "#1abc9c" },
  { id: "t7", label: "discussion", color: "#f39c12" },
  { id: "t8", label: "refactor", color: "#95a5a6" },
];

export interface Command {
  id: string;
  label: string;
  description: string;
}

export const COMMANDS: Command[] = [
  { id: "c1", label: "Insert Date", description: "Inserts the current date" },
  { id: "c2", label: "Pick Emoji", description: "Opens an emoji picker" },
  { id: "c3", label: "Fetch Quote", description: "Fetches a random quote" },
  { id: "c4", label: "Cancel Demo", description: "Returns null (no insert)" },
];

// Simulated async user search with pagination
const ALL_ASYNC_USERS: User[] = Array.from({ length: 100 }, (_, i) => ({
  id: `async-u${i + 1}`,
  name: `User ${i + 1}`,
  role: ["Engineer", "Designer", "PM", "DevOps", "Analyst"][i % 5]!,
}));

export async function searchUsers(
  query: string,
  page: number
): Promise<{ items: User[]; hasMore: boolean }> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

  const filtered = query
    ? ALL_ASYNC_USERS.filter((u) =>
        u.name.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_ASYNC_USERS;

  const pageSize = 15;
  const start = page * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    hasMore: start + pageSize < filtered.length,
  };
}
