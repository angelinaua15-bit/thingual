import { Redirect } from 'expo-router';
import { useApp } from '../src/store/useApp';

export default function Index() {
  const onboarded = useApp((s) => s.onboarded);
  return <Redirect href={onboarded ? '/(tabs)/path' : '/onboarding'} />;
}
