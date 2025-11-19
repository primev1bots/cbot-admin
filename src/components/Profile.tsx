import React, { useMemo, useState } from "react";
import { User, updateProfile, updatePassword } from "firebase/auth";

interface ProfileProps {
  user: User;
}

// Small helper for a nicer strength readout without adding deps
function getPasswordStrength(pw: string) {
  if (!pw) return { label: "", score: 0 };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const clamp = Math.min(score, 4);
  const label = ["Weak", "Fair", "Good", "Strong", "Strong"][clamp];
  return { label, score: clamp };
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [name, setName] = useState(user.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"name" | "new" | "confirm" | null>(null);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const initials = (user.displayName || user.email || "?").slice(0, 2).toUpperCase();

  const validateForm = () => {
    if (newPassword && newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      setMessageType("error");
      return false;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageType("error");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage("");

    try {
      const updates: string[] = [];

      if (name && name !== user.displayName) {
        await updateProfile(user, { displayName: name });
        updates.push("name");
      }

      if (newPassword) {
        await updatePassword(user, newPassword);
        updates.push("password");
      }

      if (updates.length > 0) {
        setMessage(`Successfully updated ${updates.join(" and ")}!`);
        setMessageType("success");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage("No changes to save.");
        setMessageType("error");
      }
    } catch (error: any) {
      console.error(error);
      let errorMessage = "Error updating profile.";

      if (error.code === "auth/requires-recent-login") {
        errorMessage = "For security, please log out and log in again to change your password.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      }

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = name !== user.displayName || !!newPassword || !!confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Top header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin Profile</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage your account settings and preferences</p>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className={`${
              hasChanges && !isLoading
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow"
                : "bg-slate-300/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 cursor-not-allowed"
            } inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
            aria-disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-0.5 mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Saving
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Identity card */}
          <section className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
              <div className="w-24 h-24 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 shadow-inner mx-auto mb-4">
                <span className="text-white text-3xl font-black tracking-tight">{initials}</span>
              </div>
              <h2 className="text-white text-2xl font-semibold text-center">{user.displayName || "Admin User"}</h2>
              <p className="text-blue-100 text-center mt-1 text-sm">{user.email}</p>
            </div>
            <div className="p-6 text-center border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Account created: {new Date(user.metadata.creationTime!).toLocaleDateString()} • Last login: {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </section>

          {/* Right: Form card */}
          <section className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            {/* Message / Alert */}
            {message && (
              <div
                role="status"
                className={`mx-6 mt-6 rounded-xl p-4 border ${
                  messageType === "success"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                    : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  {messageType === "success" ? (
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-sm font-medium leading-6">{message}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* Display Name */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Display Name
                </label>
                <div className={`relative rounded-xl border ${
                  focused === "name" ? "border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/40" : "border-slate-200 dark:border-slate-700"
                } bg-slate-50 dark:bg-slate-800/60 transition-all`}
                >
                  <input
                    id="displayName"
                    className="w-full bg-transparent rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
                    value={name}
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Email Address</label>
                <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60">
                  <input
                    aria-readonly
                    className="w-full bg-transparent rounded-xl px-4 py-3 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                    value={user.email || ""}
                    disabled
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Email cannot be changed</p>
              </div>

              {/* Password Section */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <svg className="h-5 w-5 text-blue-700 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</h3>
                </div>

                <div className="space-y-4">
                  {/* New password */}
                  <div className={`relative rounded-xl border ${
                    focused === "new" ? "border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/40" : "border-slate-200 dark:border-slate-700"
                  } bg-white dark:bg-slate-800/60 transition-all`}
                  >
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-transparent rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none pr-12"
                      value={newPassword}
                      onFocus={() => setFocused("new")}
                      onBlur={() => setFocused(null)}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m9.02 9.02l3.83 3.83" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {newPassword && (
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            strength.score <= 1
                              ? "bg-red-500 w-1/4"
                              : strength.score === 2
                              ? "bg-yellow-500 w-2/4"
                              : strength.score === 3
                              ? "bg-green-500 w-3/4"
                              : "bg-green-600 w-full"
                          }`}
                        />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Strength: {strength.label}</p>
                    </div>
                  )}

                  {/* Confirm password */}
                  <div className={`relative rounded-xl border ${
                    focused === "confirm" ? "border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/40" : "border-slate-200 dark:border-slate-700"
                  } bg-white dark:bg-slate-800/60 transition-all`}
                  >
                    <input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-transparent rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
                      value={confirmPassword}
                      onFocus={() => setFocused("confirm")}
                      onBlur={() => setFocused(null)}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Requirements checklist */}
                  {newPassword && (
                    <div className="rounded-xl bg-white dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Password Requirements</p>
                      <ul className="space-y-1 text-xs">
                        <li className={`flex items-center ${newPassword.length >= 6 ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400"}`}>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {newPassword.length >= 6 ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                          At least 6 characters
                        </li>
                        <li className={`flex items-center ${newPassword === confirmPassword && confirmPassword ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400"}`}>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {newPassword === confirmPassword && confirmPassword ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                          Passwords match
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
