import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { User } from "../../types/auth";
import LoginPage from "./LoginPage";

const admin: User = {
  id: 1,
  username: "admin",
  role: "admin",
  office_id: null,
  office: null,
  is_active: true,
};

function fillAndSubmit(username: string, password: string) {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage", () => {
  it("signs in with the username and password", async () => {
    const signIn = vi.fn(() => Promise.resolve(admin));
    const onSignedIn = vi.fn();
    render(<LoginPage onSignedIn={onSignedIn} signIn={signIn} />);

    fillAndSubmit("admin", "secret-pass");
    await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(admin));
    expect(signIn).toHaveBeenCalledWith("admin", "secret-pass");
  });

  it("shows the server's message and clears the password on failure", async () => {
    const signIn = vi.fn(() => Promise.reject(new Error("Incorrect username or password.")));
    render(<LoginPage onSignedIn={vi.fn()} signIn={signIn} />);

    fillAndSubmit("admin", "wrong");
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect username or password.");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("shows a notice, such as an expired session", () => {
    render(<LoginPage onSignedIn={vi.fn()} notice="Your session ended. Please sign in again." />);
    expect(screen.getByText("Your session ended. Please sign in again.")).toBeInTheDocument();
  });
});
