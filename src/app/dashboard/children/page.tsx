import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChildrenList from './components/ChildrenList';

export default async function ChildrenPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      <ChildrenList />
    </div>
  );
}
