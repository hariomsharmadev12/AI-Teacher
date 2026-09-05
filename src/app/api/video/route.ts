import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ message: "Text is required" }, { status: 400 });
    }

    // D-ID API endpoint for generating a talking head video
    const url = "https://api.d-id.com/talks";
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${process.env.DID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // We will use a default stock avatar image provided by D-ID for the demo
 source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png",        script: {
          type: "text",
          input: text,
          // Using a standard Microsoft voice (can be changed to Hindi later!)
          provider: { type: "microsoft", voice_id: "en-US-JennyNeural" }
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("D-ID Error:", data);
      return NextResponse.json({ message: "Failed to generate video" }, { status: 502 });
    }

    // D-ID returns an ID immediately. We have to poll their API to get the final mp4 URL.
    return NextResponse.json({ videoId: data.id });

  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}