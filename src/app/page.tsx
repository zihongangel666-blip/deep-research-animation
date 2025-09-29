"use client";

import MarkdownAnimator from "../components/MarkdownAnimator";
import { useAuth } from "../lib/hooks/useAuth";
import SignInWithEmail from "../components/SignInWithGoogle";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-bold">Sign in to start</h1>
          <p className="text-gray-600 max-w-md">
            You must be signed in with your email to paste your markdown report and create animations.
          </p>
          <div className="grid place-items-center">
            <SignInWithEmail />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto pb-6">
        <h1 className="text-4xl font-bold">Markdown Animation Editor</h1>
        <p className="text-gray-600 pt-2">Paste a markdown report. Each heading gets a 16:9 editable animation canvas. Click a canvas to paste custom code.</p>
      </div>
      <MarkdownAnimator />
    </main>
  );
}
