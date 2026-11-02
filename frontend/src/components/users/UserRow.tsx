import { useState } from "react";
import type { UserChanges } from "../../api/users";
import { ROLE_LABELS, type Office, type Role, type User } from "../../types/auth";

interface UserRowProps {
  user: User;
  offices: Office[];
  isSelf: boolean;
  /** Saves the changes; `done` is the confirmation shown once they are saved. */
  onChange: (changes: UserChanges, done: string) => Promise<void>;
}

type Mode = "view" | "role" | "password";

const ROLES: Role[] = ["staff", "leadership", "admin"];

function UserRow({ user, offices, isSelf, onChange }: UserRowProps) {
  const [mode, setMode] = useState<Mode>("view");
  const [role, setRole] = useState<Role>(user.role);
  const [officeId, setOfficeId] = useState<number | null>(user.office_id ?? offices[0]?.id ?? null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (changes: UserChanges, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await onChange(changes, done);
      setMode("view");
      setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setMode("view");
    setRole(user.role);
    setPassword("");
    setError(null);
  };

  return (
    <tr className={user.is_active ? undefined : "inactive-row"}>
      <td>
        {user.username}
        {isSelf && <span className="muted"> (you)</span>}
      </td>
      <td>
        {mode === "role" ? (
          <select
            aria-label={`Role for ${user.username}`}
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        ) : (
          ROLE_LABELS[user.role]
        )}
      </td>
      <td>
        {mode === "role" && role === "staff" ? (
          <select
            aria-label={`Office for ${user.username}`}
            value={officeId ?? ""}
            onChange={(event) => setOfficeId(Number(event.target.value))}
          >
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </select>
        ) : (
          (user.office ?? <span className="muted">All offices</span>)
        )}
      </td>
      <td>{user.is_active ? "Active" : "Deactivated"}</td>
      <td>
        <div className="row-actions">
          {mode === "view" && (
            <>
              {!isSelf && (
                <button type="button" className="reset-button" onClick={() => setMode("role")}>
                  Change role
                </button>
              )}
              <button type="button" className="reset-button" onClick={() => setMode("password")}>
                Reset password
              </button>
              {!isSelf && (
                <button
                  type="button"
                  className="reset-button"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      { is_active: !user.is_active },
                      user.is_active
                        ? `Deactivated ${user.username}. They have been signed out.`
                        : `Reactivated ${user.username}.`,
                    )
                  }
                >
                  {user.is_active ? "Deactivate" : "Reactivate"}
                </button>
              )}
            </>
          )}
          {mode === "role" && (
            <>
              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={() =>
                  void run(
                    { role, office_id: role === "staff" ? officeId : null },
                    `Updated ${user.username}'s role to ${ROLE_LABELS[role]}.`,
                  )
                }
              >
                Save
              </button>
              <button type="button" className="reset-button" onClick={cancel}>
                Cancel
              </button>
            </>
          )}
          {mode === "password" && (
            <>
              <input
                type="text"
                aria-label={`New password for ${user.username}`}
                placeholder="New password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="primary-button"
                disabled={busy || password.length === 0}
                onClick={() =>
                  void run(
                    { password },
                    `Set a new password for ${user.username}.` +
                      (isSelf ? " Sign in again with it." : " They have been signed out."),
                  )
                }
              >
                Save
              </button>
              <button type="button" className="reset-button" onClick={cancel}>
                Cancel
              </button>
            </>
          )}
        </div>
        {error && (
          <div className="row-error" role="alert">
            {error}
          </div>
        )}
      </td>
    </tr>
  );
}

export default UserRow;
