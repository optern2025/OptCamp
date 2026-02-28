import { type NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

interface University {
    name: string;
    domains: string[];
    web_pages: string[];
    country: string;
    alpha_two_code: string;
    "state-province": string | null;
}

// Cache the parsed JSON in memory so we only read from disk once
let cachedUniversities: University[] | null = null;

function getUniversities(): University[] {
    if (!cachedUniversities) {
        const filePath = path.join(
            process.cwd(),
            "app/assets/world_universities_and_domains.json",
        );
        const raw = fs.readFileSync(filePath, "utf-8");
        cachedUniversities = JSON.parse(raw) as University[];
    }
    return cachedUniversities;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();

    if (query.length < 2) {
        return NextResponse.json([]);
    }

    const universities = getUniversities();

    const results = [];
    for (const uni of universities) {
        if (results.length >= 20) break;

        if (
            uni.name.toLowerCase().includes(query) ||
            uni.country.toLowerCase().includes(query) ||
            uni.domains.some((d) => d.toLowerCase().includes(query))
        ) {
            results.push({
                name: uni.name,
                country: uni.country,
                alpha_two_code: uni.alpha_two_code,
                domain: uni.domains[0] || "",
            });
        }
    }

    return NextResponse.json(results);
}
