import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "Video ID is required" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.d-id.com/talks/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${process.env.DID_API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: "Failed to fetch video status" }, { status: 502 });
    }

    // D-ID status can be 'created', 'started', 'done', or 'error'
    return NextResponse.json({
      status: data.status,
      result_url: data.result_url || null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}