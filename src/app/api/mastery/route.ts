import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'mastery.json');

interface MasteryFile {
  schema: 'leetmentor.mastery.v1';
  entries: unknown[];
}

async function ensureFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

export async function GET() {
  try {
    await ensureFile();
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    const entries =
      parsed && typeof parsed === 'object' && Array.isArray((parsed as MasteryFile).entries)
        ? (parsed as MasteryFile).entries
        : Array.isArray(parsed)
        ? parsed
        : [];
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    await ensureFile();
    const body = await request.json();
    const payload: MasteryFile = {
      schema: 'leetmentor.mastery.v1',
      entries: Array.isArray(body) ? body : [],
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save mastery data' },
      { status: 500 }
    );
  }
}
