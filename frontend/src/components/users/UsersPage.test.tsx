import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AuditEntry, User } from "../../types/auth";
import UsersPage from "./UsersPage";

const offices = [
  { id: 1, name: "Retriever Essentials" },
  { id: 2, name: "Emergency Aid Program" },
];
const admin: User = { id: 1, username: "admin", role: "admin", office_id: null, office: null, is_active: true };
const staff: User = {
  id: 2,
  username: "jdoe",
  role: "staff",
  office_id: 1,
  office: "Retriever Essentials",
  is_active: true,
};
const entry: AuditEntry = {
  id: 1,
  created_at: "2026-11-01T15:00:00Z",
  username: "jdoe",
  action: "replace",
  office: "Retriever Essentials",
  filename: "week.csv",
  upload_batch_id: null,
  details: {
    rows: 1,
    first_week: "2026-10-12",
    last_week: "2026-10-12",
    replaced_rows: 1,
    replaced_files: ["old.csv"],
  },
};

function renderPage(overrides: Partial<Parameters<typeof UsersPage>[0]> = {}) {
  const props = {
    currentUserId: 1,
    loadUsers: vi.fn(() => Promise.resolve([admin, staff])),
    loadOffices: () => Promise.resolve(offices),
    loadAuditLog: () => Promise.resolve([entry]),
    addUser: vi.fn(),
    changeUser: vi.fn(),
    ...overrides,
  };
  render(<UsersPage {...props} />);
  return props;
}

async function rowFor(username: string) {
  const accounts = await screen.findByRole("table", { name: "Accounts" });
  return (await within(accounts).findByText(username)).closest("tr") as HTMLElement;
}

describe("UsersPage", () => {
  it("lists accounts and upload activity", async () => {
    renderPage();
    const self = await rowFor("admin");
    expect(within(self).getByText("(you)")).toBeInTheDocument();
    expect(within(self).queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
    expect(within(self).queryByRole("button", { name: "Change role" })).not.toBeInTheDocument();

    const row = await rowFor("jdoe");
    expect(within(row).getByText("Staff")).toBeInTheDocument();
    expect(within(row).getAllByText("Retriever Essentials").length).toBeGreaterThan(0);

    expect(screen.getByText(/Uploaded and replaced earlier weeks: 1 week/)).toBeInTheDocument();
    expect(screen.getByText("Replaced weeks from old.csv")).toBeInTheDocument();
  });

  it("creates a staff account for the chosen office", async () => {
    const addUser = vi.fn(() => Promise.resolve({ ...staff, id: 3, username: "newbie" }));
    const props = renderPage({ addUser });
    await rowFor("jdoe");

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "newbie" } });
    fireEvent.change(screen.getByLabelText("Temporary password"), { target: { value: "temp-pass-1" } });
    fireEvent.change(screen.getByLabelText("Office"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Created staff account newbie");
    expect(addUser).toHaveBeenCalledWith({
      username: "newbie",
      password: "temp-pass-1",
      role: "staff",
      office_id: 2,
    });
    expect(props.loadUsers).toHaveBeenCalledTimes(2);
  });

  it("sends no office for leadership and admin accounts", async () => {
    const addUser = vi.fn(() => Promise.resolve({ ...admin, id: 3, username: "dean", role: "leadership" as const }));
    renderPage({ addUser });
    await rowFor("jdoe");

    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "leadership" } });
    expect(screen.queryByLabelText("Office")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "dean" } });
    fireEvent.change(screen.getByLabelText("Temporary password"), { target: { value: "temp-pass-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    await screen.findByRole("status");
    expect(addUser).toHaveBeenCalledWith(expect.objectContaining({ role: "leadership", office_id: null }));
  });

  it("shows the server's message when an account cannot be created", async () => {
    renderPage({ addUser: () => Promise.reject(new Error("The username jdoe is already taken.")) });
    await rowFor("jdoe");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "jdoe" } });
    fireEvent.change(screen.getByLabelText("Temporary password"), { target: { value: "temp-pass-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already taken");
  });

  it("resets a password, deactivates and changes a role", async () => {
    const changeUser = vi.fn(() => Promise.resolve(staff));
    renderPage({ changeUser });
    const row = await rowFor("jdoe");

    fireEvent.click(within(row).getByRole("button", { name: "Reset password" }));
    fireEvent.change(within(row).getByLabelText("New password for jdoe"), { target: { value: "new-pass-1" } });
    fireEvent.click(within(row).getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("status")).toHaveTextContent("They have been signed out.");
    expect(changeUser).toHaveBeenLastCalledWith(2, { password: "new-pass-1" });

    fireEvent.click(within(row).getByRole("button", { name: "Deactivate" }));
    expect(await screen.findByText(/Deactivated jdoe/)).toBeInTheDocument();
    expect(changeUser).toHaveBeenLastCalledWith(2, { is_active: false });

    fireEvent.click(within(row).getByRole("button", { name: "Change role" }));
    fireEvent.change(within(row).getByLabelText("Role for jdoe"), { target: { value: "leadership" } });
    expect(within(row).queryByLabelText("Office for jdoe")).not.toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(changeUser).toHaveBeenLastCalledWith(2, { role: "leadership", office_id: null }));
  });

  it("keeps the row open with the error when a change fails", async () => {
    renderPage({ changeUser: () => Promise.reject(new Error("Passwords must be at least 8 characters.")) });
    const row = await rowFor("jdoe");
    fireEvent.click(within(row).getByRole("button", { name: "Reset password" }));
    fireEvent.change(within(row).getByLabelText("New password for jdoe"), { target: { value: "short" } });
    fireEvent.click(within(row).getByRole("button", { name: "Save" }));
    expect(await within(row).findByRole("alert")).toHaveTextContent("at least 8 characters");
    expect(within(row).getByLabelText("New password for jdoe")).toBeInTheDocument();
  });
});
