import type { Metadata } from 'next';
import TasksShell from '../../components/tasks/TasksShell';

export const metadata: Metadata = {
  title: 'KadeHub Tasks — Get anything done by people near you',
  description: 'Post a task, get offers from trusted local taskers, and pick the best one for the job. Cleaning, moving, repairs, tutoring and more.',
};

// Served at tasks.kadehub.com (src/proxy.ts rewrites the subdomain into /tasks).
export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <TasksShell>{children}</TasksShell>;
}
