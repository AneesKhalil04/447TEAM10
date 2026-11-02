import { useCallback, useEffect, useState } from "react";
import {
  createUser,
  fetchAuditLog,
  fetchOffices,
  fetchUsers,
  updateUser,
  type NewUser,
  type UserChanges,
} from "../../api/users";
import { ROLE_LABELS, type AuditEntry, type Office, type User } from "../../types/auth";
import AddUserForm from "./AddUserForm";
import AuditLogTable from "./AuditLogTable";
import UserRow from "./UserRow";
import "./UsersPage.css";

interface UsersPageProps {
  currentUserId: number;
  loadUsers?: (signal?: AbortSignal) => Promise<User[]>;
  loadOffices?: (signal?: AbortSignal) => Promise<Office[]>;
  loadAuditLog?: (signal?: AbortSignal) => Promise<AuditEntry[]>;
  addUser?: (user: NewUser) => Promise<User>;
  changeUser?: (id: number, changes: UserChanges) => Promise<User>;
}

function errorText(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Something went wrong.";
}

function UsersPage({
  currentUserId,
  loadUsers = fetchUsers,
  loadOffices = fetchOffices,
  loadAuditLog = fetchAuditLog,
  addUser = createUser,
  changeUser = updateUser,
}: UsersPageProps) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshUsers = useCallback(
    (signal?: AbortSignal) =>
      loadUsers(signal)
        .then(setUsers)
        .catch((reason: unknown) => {
          if (!signal?.aborted) setLoadError(errorText(reason));
        }),
    [loadUsers],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refreshUsers(controller.signal);
    loadOffices(controller.signal)
      .then(setOffices)
      .catch(() => {});
    loadAuditLog(controller.signal)
      .then(setAudit)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setLoadError(errorText(reason));
      });
    return () => controller.abort();
  }, [refreshUsers, loadOffices, loadAuditLog]);

  const handleCreate = async (user: NewUser) => {
    const created = await addUser(user);
    setMessage(
      `Created ${ROLE_LABELS[created.role].toLowerCase()} account ${created.username}. ` +
        "Share the temporary password with them directly.",
    );
    void refreshUsers();
  };

  const handleChange = async (user: User, changes: UserChanges, done: string) => {
    await changeUser(user.id, changes);
    setMessage(done);
    void refreshUsers();
  };

  return (
    <div className="users-page">
      {loadError && (
        <div className="dash-alert" role="alert">
          {loadError}
        </div>
      )}
      {message && (
        <div className="users-message" role="status">
          <span>{message}</span>
          <button type="button" className="reset-button" onClick={() => setMessage(null)}>
            Dismiss
          </button>
        </div>
      )}

      <AddUserForm offices={offices} onCreate={handleCreate} />

      <section className="dash-card" aria-labelledby="accounts-title">
        <div className="card-title" id="accounts-title">
          Accounts
        </div>
        <div className="card-note">
          Admins manage everything. Staff upload for their own office. Leadership can only view the dashboard.
          Deactivated accounts cannot sign in.
        </div>
        {users && (
          <div className="table-scroll">
            <table className="office-table users-table" aria-labelledby="accounts-title">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Office</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    offices={offices}
                    isSelf={user.id === currentUserId}
                    onChange={(changes, done) => handleChange(user, changes, done)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dash-card" aria-labelledby="audit-title">
        <div className="card-title" id="audit-title">
          Upload activity
        </div>
        <div className="card-note">Who uploaded or replaced data, newest first. Kept even after data is reset.</div>
        {audit && <AuditLogTable entries={audit} />}
      </section>
    </div>
  );
}

export default UsersPage;
