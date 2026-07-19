import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request.", details: error.flatten() },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : fallback;
  const status =
    message === "Authentication required."
      ? 401
      : message === "Project not found."
        ? 404
        : 400;

  return NextResponse.json({ error: message }, { status });
}
