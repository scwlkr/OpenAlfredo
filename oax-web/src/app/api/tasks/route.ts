import { NextResponse } from 'next/server';
import { listTasks, appendTask, dueTasks, toggleTaskDone, deleteTask } from '@/lib/tasks';
import { logInfo, logError } from '@/lib/logger';

// GET /api/tasks?due=1 -> list all tasks, or only ones due now
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyDue = searchParams.get('due') === '1';
    const tasks = onlyDue ? dueTasks() : listTasks();
    return NextResponse.json({ tasks });
  } catch (err: any) {
    logError('tasks_list_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'TASKS_LIST_FAILED' },
      { status: 500 }
    );
  }
}

// POST /api/tasks { task: "buy milk |when:2026-04-05T09:00:00Z" }
export async function POST(request: Request) {
  try {
    const { task } = await request.json();
    if (!task || typeof task !== 'string') {
      return NextResponse.json(
        { error: 'Missing task', code: 'TASKS_MISSING_TASK' },
        { status: 400 }
      );
    }
    appendTask(task);
    logInfo('task_appended_manual', { task });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logError('tasks_append_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'TASKS_APPEND_FAILED' },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks { raw: "<task body>", done: boolean }
export async function PATCH(request: Request) {
  try {
    const { raw, done } = await request.json();
    if (!raw || typeof raw !== 'string' || typeof done !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing raw or done', code: 'TASKS_MISSING_FIELDS' },
        { status: 400 }
      );
    }
    const updated = toggleTaskDone(raw, done);
    if (!updated) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASKS_NOT_FOUND' },
        { status: 404 }
      );
    }
    logInfo('task_toggled', { raw, done });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logError('tasks_patch_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'TASKS_PATCH_FAILED' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks { raw: "<task body>" }
export async function DELETE(request: Request) {
  try {
    const { raw } = await request.json();
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json(
        { error: 'Missing raw', code: 'TASKS_MISSING_RAW' },
        { status: 400 }
      );
    }
    const removed = deleteTask(raw);
    if (!removed) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASKS_NOT_FOUND' },
        { status: 404 }
      );
    }
    logInfo('task_deleted', { raw });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logError('tasks_delete_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'TASKS_DELETE_FAILED' },
      { status: 500 }
    );
  }
}
