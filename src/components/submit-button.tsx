"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleText: string;
  loadingText: string;
  className?: string;
};

export function SubmitButton({ idleText, loadingText, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={
        className ??
        "rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
      }
      disabled={pending}
    >
      {pending ? loadingText : idleText}
    </button>
  );
}
