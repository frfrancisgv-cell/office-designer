import type { Metadata } from 'next';
import { PsalmToneCreator } from '@/components/PsalmToneCreator';

export const metadata: Metadata = {
  title: 'Psalm Tone Creator',
  description: 'Design a psalm tone on a model text and save it to the tone library.',
};

export default function ToneCreatorPage() {
  return <main className="min-h-screen"><PsalmToneCreator /></main>;
}
