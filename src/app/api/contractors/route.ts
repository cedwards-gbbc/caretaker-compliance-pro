import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discoverLogoUrl, normaliseCompanyWebsite } from "@/lib/logoDiscovery";

export const dynamic = "force-dynamic";

export async function GET() {
  const contractors = await prisma.contractorCompany.findMany({
    where: { active: true },
    orderBy: { companyName: "asc" }
  });

  return NextResponse.json({ contractors });
}

export async function POST(req: Request) {
  const body = await req.json();

  const companyName = String(body.companyName ?? "").trim();
  const websiteUrl = normaliseCompanyWebsite(String(body.websiteUrl ?? ""));
  const companyPhone = String(body.companyPhone ?? "").trim();

  if (!companyName) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }

  if (!websiteUrl) {
    return NextResponse.json({ error: "Website URL is required." }, { status: 400 });
  }

  if (!companyPhone) {
    return NextResponse.json({ error: "Company phone is required." }, { status: 400 });
  }

  const logoUrl = body.logoUrl ? String(body.logoUrl) : await discoverLogoUrl(websiteUrl);

  const contractor = await prisma.contractorCompany.upsert({
    where: { companyName },
    update: {
      websiteUrl,
      companyPhone,
      logoUrl,
      tradeType: String(body.tradeType ?? ""),
      contactName: String(body.contactName ?? ""),
      email: String(body.email ?? ""),
      abn: String(body.abn ?? ""),
      active: body.active === false ? false : true
    },
    create: {
      companyName,
      websiteUrl,
      companyPhone,
      logoUrl,
      tradeType: String(body.tradeType ?? ""),
      contactName: String(body.contactName ?? ""),
      email: String(body.email ?? ""),
      abn: String(body.abn ?? ""),
      active: true
    }
  });

  return NextResponse.json({ contractor });
}
