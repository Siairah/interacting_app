"use client";

// Reuse the same profile page component for dynamic user profiles.
// The component at ../page.tsx already detects /profile/[id] path
// and fetches the clicked user's profile via /get-user-profile/by-id/:id.

export { default } from "../page";


