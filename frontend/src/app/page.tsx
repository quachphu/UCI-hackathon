"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { addDoc, collection, getDocs, limit, query, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import {
  auth,
  db,
  isFirebaseConfigured,
  signInWithGooglePopup,
  signOutCurrentUser,
} from "@/lib/firebase";

type SmokeRecord = {
  id: string;
  message: string;
  uid: string;
};

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Firebase is ready.");
  const [smokeText, setSmokeText] = useState("first smoke test");
  const [records, setRecords] = useState<SmokeRecord[]>([]);

  async function handleSignUp() {
    if (!auth) {
      setMessage("Firebase Auth is not configured.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage("Signup successful.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signup failed.");
    }
  }

  async function handleSignIn() {
    if (!auth) {
      setMessage("Firebase Auth is not configured.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Login successful.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    }
  }

  async function handleSignOut() {
    try {
      await signOutCurrentUser();
      setMessage("Signed out.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign out failed.");
    }
  }

  async function handleGoogleSignIn() {
    try {
      await signInWithGooglePopup();
      setMessage("Google sign-in successful.");
      router.push("/chat");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
    }
  }

  async function handleSmokeWrite() {
    if (!db || !user) {
      setMessage("Sign in first, then run Firestore smoke test.");
      return;
    }

    try {
      await addDoc(collection(db, "chat_messages"), {
        message: smokeText,
        uid: user.uid,
        source: "web_smoke_test",
        createdAt: serverTimestamp(),
      });
      setMessage("Firestore write successful (chat_messages).");
      await handleSmokeRead();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Firestore write failed.");
    }
  }

  async function handleSmokeRead() {
    if (!db) {
      setMessage("Firestore is not configured.");
      return;
    }

    try {
      const smokeQuery = query(collection(db, "chat_messages"), limit(5));
      const snapshot = await getDocs(smokeQuery);
      const nextRecords = snapshot.docs.map((doc) => {
        const data = doc.data() as { message?: string; uid?: string };
        return {
          id: doc.id,
          message: data.message ?? "",
          uid: data.uid ?? "",
        };
      });
      setRecords(nextRecords);
      setMessage(`Loaded ${nextRecords.length} message record(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Firestore read failed.");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-16">
      <main className="w-full rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-black">
        <h1 className="text-3xl font-semibold tracking-tight">UCI Hackathon Frontend</h1>
        <p className="mt-3 text-sm text-foreground/70">
          Minimal Firebase Auth + Firestore smoke-test panel.
        </p>

        <div className="mt-8 grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <p className="font-medium">API Base URL</p>
            <p className="mt-1 text-foreground/70">{apiBaseUrl ?? "Missing NEXT_PUBLIC_API_BASE_URL"}</p>
          </div>

          <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <p className="font-medium">Firebase Config</p>
            <p className="mt-1 text-foreground/70">{isFirebaseConfigured ? "Configured" : "Missing env values"}</p>
          </div>
        </div>

        <section className="mt-6 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <p className="font-medium">Email/Password Auth</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded-md border border-black/15 px-3 py-2"
              type="email"
              placeholder="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="rounded-md border border-black/15 px-3 py-2"
              type="password"
              placeholder="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-md border px-3 py-2" onClick={handleSignUp}>
              Sign up
            </button>
            <button className="rounded-md border px-3 py-2" onClick={handleSignIn}>
              Sign in
            </button>
            <button className="rounded-md border px-3 py-2" onClick={handleGoogleSignIn}>
              Sign in with Google
            </button>
            <button className="rounded-md border px-3 py-2" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
          <p className="mt-2 text-foreground/70">
            Current user: {user?.email ?? "not signed in"}
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <p className="font-medium">Firestore Smoke Test (`chat_messages`)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="min-w-65 flex-1 rounded-md border border-black/15 px-3 py-2"
              value={smokeText}
              onChange={(event) => setSmokeText(event.target.value)}
            />
            <button className="rounded-md border px-3 py-2" onClick={handleSmokeWrite}>
              Write test message
            </button>
            <button className="rounded-md border px-3 py-2" onClick={handleSmokeRead}>
              Reload latest
            </button>
          </div>

          <ul className="mt-3 space-y-2 text-xs text-foreground/80">
            {records.map((record) => (
              <li key={record.id} className="rounded border border-black/10 p-2 dark:border-white/10">
                <span className="font-medium">{record.uid || "unknown user"}</span>: {record.message || "(empty)"}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6 rounded-md bg-black/5 px-3 py-2 text-xs text-foreground/80 dark:bg-white/10">
          Status: {message}
        </p>
      </main>
    </div>
  );
}
