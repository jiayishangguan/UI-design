import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG/PNG/WebP allowed" }, { status: 400 });
    }

    if (!process.env.PINATA_JWT || process.env.PINATA_JWT === "your-pinata-jwt") {
      return NextResponse.json({ error: "PINATA_JWT is missing" }, { status: 500 });
    }

    const pinataForm = new FormData();
    pinataForm.append("file", file);
    pinataForm.append(
      "pinataMetadata",
      JSON.stringify({
        name: file.name,
        keyvalues: { uploadedAt: new Date().toISOString() }
      })
    );

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`
      },
      body: pinataForm
    });

    if (!response.ok) {
      return NextResponse.json({ error: "IPFS upload failed" }, { status: 502 });
    }

    const payload = await response.json();
    return NextResponse.json({ cid: payload.IpfsHash, size: payload.PinSize });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown upload error" },
      { status: 500 }
    );
  }
}
