import { useState, type FormEvent } from "react";
import type { NewUser } from "../../api/users";
import { ROLE_LABELS, type Office, type Role } from "../../types/auth";

interface AddUserFormProps {
  offices: Office[];
  onCreate: (user: NewUser) => Promise<void>;
}

const ROLES: Role[] = ["staff", "leadership", "admin"];

function AddUserForm({ offices, onCreate }: AddUserFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [officeId, setOfficeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Default to the first office once the list arrives.
  const selectedOffice = officeId ?? offices[0]?.id ?? null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({ username, password, role, office_id: role === "staff" ? selectedOffice : null });
      setUsername("");
      setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dash-card" aria-labelledby="add-user-title">
      <div className="card-title" id="add-user-title">
        Add an account
      </div>
      <div className="card-note">
        Pick a username and a temporary password (at least 8 characters), then give them to the person.
      </div>
      {error && (
        <div className="dash-alert" role="alert">
          {error}
        </div>
      )}
      <form className="add-user-form" onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="new-username">Username</label>
          <input
            id="new-username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="new-password">Temporary password</label>
          <input
            id="new-password"
            type="text"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="new-role">Role</label>
          <select id="new-role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        {role === "staff" && (
          <div className="field">
            <label htmlFor="new-office">Office</label>
            <select
              id="new-office"
              value={selectedOffice ?? ""}
              onChange={(event) => setOfficeId(Number(event.target.value))}
            >
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Adding…" : "Add account"}
        </button>
      </form>
    </section>
  );
}

export default AddUserForm;
