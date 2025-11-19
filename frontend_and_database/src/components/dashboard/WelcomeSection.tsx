import { useUser } from '@/firebase';
import { getGreeting, getUserFirstName } from '@/utils/dashboard';

export function WelcomeSection() {
  const { user } = useUser();

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-700">
        {getGreeting()}, {getUserFirstName(user?.displayName, user?.email)}
      </h1>
      <p className="text-gray-600 mt-2">
        Here's what's been happening with your mental health journey
      </p>
    </div>
  );
}