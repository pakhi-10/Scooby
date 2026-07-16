// Server-only: MongoDB access + Google ID-token verification for Room Switch.
import { MongoClient, type Collection } from "mongodb";
import { env } from "$env/dynamic/private";
import { EMAIL_DOMAIN, type Listing } from "$lib/roomSwitch";

// --- Mongo (single cached connection, reused across serverless invocations) ---
let clientPromise: Promise<MongoClient> | null = null;
let indexed = false;

type ListingDoc = Omit<Listing, "id"> & { _id?: unknown };

export async function listings(): Promise<Collection<ListingDoc>> {
	if (!env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
	if (!clientPromise) clientPromise = new MongoClient(env.MONGODB_URI).connect();
	const col = (await clientPromise)
		.db(env.MONGODB_DB || "scooby")
		.collection<ListingDoc>("listings");
	if (!indexed) {
		// One listing per person; take-down/re-post just replaces it.
		await col.createIndex({ email: 1 }, { unique: true });
		indexed = true;
	}
	return col;
}

// --- Google verification ---
// Verifies a GIS ID token via Google's tokeninfo endpoint (Google checks the
// signature + expiry), then enforces our audience + SNU domain.
// ponytail: tokeninfo HTTP call; switch to local JWKS verify if rate-limited.
export async function verifyGoogle(
	token: string,
): Promise<{ email: string; name: string } | null> {
	if (!token) return null;
	const res = await fetch(
		"https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token),
	);
	if (!res.ok) return null;
	const p: Record<string, string> = await res.json();
	if (!env.GOOGLE_CLIENT_ID || p.aud !== env.GOOGLE_CLIENT_ID) return null;
	if (p.email_verified !== "true") return null;
	const email = (p.email || "").toLowerCase();
	if (!email.endsWith("@" + EMAIL_DOMAIN)) return null;
	return { email, name: p.name || email.split("@")[0] };
}
