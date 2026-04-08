import { NextResponse } from 'next/server';
import {
  listWorkspaceFiles,
  readWorkspaceFile,
  saveWorkspaceFile,
  saveSticky,
  WorkspaceSubdir,
} from '@/lib/workspace';
import { logInfo, logError } from '@/lib/logger';

const VALID_SUBDIRS = new Set<WorkspaceSubdir>(['desk', 'files', 'generated']);

function isValidSubdir(s: string): s is WorkspaceSubdir {
  return VALID_SUBDIRS.has(s as WorkspaceSubdir);
}

// GET /api/workspace?subdir=desk
// GET /api/workspace?subdir=desk&file=note.md
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subdirParam = searchParams.get('subdir');
    const fileParam = searchParams.get('file');

    const subdir = subdirParam && isValidSubdir(subdirParam) ? subdirParam : undefined;

    if (fileParam && subdir) {
      const content = readWorkspaceFile(subdir, fileParam);
      return NextResponse.json({ name: fileParam, subdir, content });
    }

    const files = listWorkspaceFiles(subdir);
    return NextResponse.json({ files });
  } catch (err: any) {
    logError('workspace_list_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'WORKSPACE_READ_FAILED' },
      { status: 500 }
    );
  }
}

// POST /api/workspace
// Body: { sticky: true, title: "...", content: "..." }
//   or: { subdir: "files", name: "doc.md", content: "..." }
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.sticky) {
      if (!body.title || !body.content) {
        return NextResponse.json(
          { error: 'Missing title or content', code: 'WORKSPACE_MISSING_FIELDS' },
          { status: 400 }
        );
      }
      const fullPath = saveSticky(body.title, body.content);
      logInfo('sticky_saved_manual', { title: body.title, path: fullPath });
      return NextResponse.json({ success: true, path: fullPath });
    }

    if (!body.name || !body.content) {
      return NextResponse.json(
        { error: 'Missing name or content', code: 'WORKSPACE_MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const subdir: WorkspaceSubdir =
      body.subdir && isValidSubdir(body.subdir) ? body.subdir : 'files';
    const fullPath = saveWorkspaceFile({ name: body.name, content: body.content }, subdir);
    logInfo('workspace_file_saved_manual', { name: body.name, subdir, path: fullPath });
    return NextResponse.json({ success: true, path: fullPath });
  } catch (err: any) {
    logError('workspace_save_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'WORKSPACE_SAVE_FAILED' },
      { status: 500 }
    );
  }
}
